const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

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

    if (trip.creatorId !== OPENID) {
      return { code: 403, message: '只能取消自己创建的行程' };
    }

    await trips.doc(tripId).update({
      data: { status: 'cancelled' },
    });

    return { code: 0, message: '行程已取消' };
  } catch (err) {
    console.error('[cancelTrip] Error:', err);
    return { code: 500, message: '取消行程失败' };
  }
};
