const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  // Web 端（CloudBase SDK 匿名登录）拿不到微信 OPENID，用前端传入的 _uid 兜底
  const { OPENID: wxOpenid } = cloud.getWXContext();
  const OPENID = wxOpenid || event._uid;
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
        studentId: creator.studentId || '',
        wechatId: creator.wechatId || '',
      },
      departureDate,
      departureTimeStart,
      departureTimeEnd,
      // 前端按设备时区算好的绝对时间戳，云函数不做字符串解析（避免 UTC 时区偏差）
      departureEndTime: Number(event.departureEndTime) || 0,
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
          studentId: creator.studentId || '',
          wechatId: creator.wechatId || '',
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
