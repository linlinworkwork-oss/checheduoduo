const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: 401, message: '请先登录' };

  const { tripId } = event;
  if (!tripId) return { code: 400, message: '缺少行程ID' };

  try {
    const trips = db.collection('trips');
    const { data } = await trips.doc(tripId).get();
    const trip = Array.isArray(data) ? data[0] : data;
    if (!trip) return { code: 404, message: '行程不存在' };

    if (trip.creatorId === OPENID) {
      return { code: 400, message: '创建者不能退出，请取消行程' };
    }

    const { passengers } = trip;
    const updatedPassengers = passengers.filter((p) => p.userId !== OPENID);

    if (updatedPassengers.length === passengers.length) {
      return { code: 400, message: '你未加入该行程' };
    }

    await trips.doc(tripId).update({
      data: {
        currentPassengers: _.inc(-1),
        status: 'open',
        passengers: updatedPassengers,
      },
    });

    return {
      code: 0,
      trip: {
        ...trip,
        currentPassengers: trip.currentPassengers - 1,
        status: 'open',
        passengers: updatedPassengers,
      },
    };
  } catch (err) {
    console.error('[leaveTrip] Error:', err);
    return { code: 500, message: '退出行程失败' };
  }
};
