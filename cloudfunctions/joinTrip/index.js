const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const VALID_LUGGAGE = ['none', 'small', 'medium', 'large', 'xlarge'];

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: 401, message: '请先登录' };

  const { tripId, luggageSize } = event;
  if (!tripId) return { code: 400, message: '缺少行程ID' };
  if (!VALID_LUGGAGE.includes(luggageSize)) return { code: 400, message: '请选择行李大小' };

  try {
    const trips = db.collection('trips');
    const { data } = await trips.doc(tripId).get();
    const trip = Array.isArray(data) ? data[0] : data;
    if (!trip) return { code: 404, message: '行程不存在' };

    if (trip.status !== 'open') {
      return { code: 400, message: '该行程已满员或已取消' };
    }

    if (trip.creatorId === OPENID) {
      return { code: 400, message: '不能加入自己创建的行程' };
    }

    const alreadyJoined = trip.passengers.some((p) => p.userId === OPENID);
    if (alreadyJoined) {
      return { code: 400, message: '已加入该行程' };
    }

    if (trip.currentPassengers >= trip.maxPassengers) {
      return { code: 400, message: '该行程已满员' };
    }

    // Fetch joiner profile
    const { data: users } = await db.collection('users').where({ openid: OPENID }).get();
    if (users.length === 0) return { code: 404, message: '用户不存在' };

    const user = users[0];
    const passenger = {
      userId: OPENID,
      nickName: user.nickName,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      gender: user.gender,
      luggageSize,
      joinedAt: Date.now(),
    };

    const willBeFull = trip.currentPassengers + 1 >= trip.maxPassengers;

    const updateData = {
      currentPassengers: _.inc(1),
      passengers: _.push(passenger),
    };
    if (willBeFull) {
      updateData.status = 'full';
    }

    await trips.doc(tripId).update({ data: updateData });

    return {
      code: 0,
      trip: {
        ...trip,
        currentPassengers: trip.currentPassengers + 1,
        status: willBeFull ? 'full' : 'open',
        passengers: [...trip.passengers, passenger],
      },
    };
  } catch (err) {
    console.error('[joinTrip] Error:', err);
    return { code: 500, message: '加入行程失败' };
  }
};
