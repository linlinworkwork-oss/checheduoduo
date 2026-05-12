const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: 401, message: '请先登录' };

  const {
    departureDate,
    departureTimeStart,
    departureTimeEnd,
    departureLocation,
    arrivalLocation,
    ticketTime,
    maxPassengers,
    luggageSize,
    note,
  } = event;

  // Validate required fields
  if (
    !departureDate ||
    !departureTimeStart ||
    !departureTimeEnd ||
    !departureLocation ||
    !arrivalLocation ||
    !maxPassengers ||
    !luggageSize
  ) {
    return { code: 400, message: '请填写完整行程信息' };
  }

  try {
    // Fetch creator profile
    const { data: users } = await db.collection('users').where({ openid: OPENID }).get();
    if (users.length === 0) return { code: 404, message: '用户不存在' };

    const creator = users[0];

    const trip = {
      creatorId: OPENID,
      creator: {
        nickName: creator.nickName,
        avatarUrl: creator.avatarUrl,
        phone: creator.phone,
        gender: creator.gender,
      },
      departureDate,
      departureTimeStart,
      departureTimeEnd,
      departureLocation,
      arrivalLocation,
      ticketTime: ticketTime || '',
      maxPassengers,
      currentPassengers: 1,
      status: 'open',
      passengers: [
        {
          userId: OPENID,
          nickName: creator.nickName,
          avatarUrl: creator.avatarUrl,
          phone: creator.phone,
          gender: creator.gender,
          luggageSize: luggageSize,
          joinedAt: Date.now(),
        },
      ],
      note: note || '',
      createdAt: Date.now(),
    };

    const { _id } = await db.collection('trips').add({ data: trip });
    return { code: 0, trip: { ...trip, _id } };
  } catch (err) {
    console.error('[createTrip] Error:', err);
    return { code: 500, message: '创建行程失败' };
  }
};
