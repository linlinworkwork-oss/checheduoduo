const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  // Web 端（CloudBase SDK 匿名登录）拿不到微信 OPENID，用前端传入的 _uid 兜底
  const { OPENID: wxOpenid } = cloud.getWXContext();
  const OPENID = wxOpenid || event._uid;
  if (!OPENID) return { code: 401, message: '请先登录' };

  const { tripId } = event;
  if (!tripId) return { code: 400, message: '缺少行程ID' };

  try {
    const trips = db.collection('trips');
    const { data } = await trips.doc(tripId).get();
    const trip = Array.isArray(data) ? data[0] : data;
    if (!trip) return { code: 404, message: '行程不存在' };
    return { code: 0, trip };
  } catch (err) {
    console.error('[getTrip] Error:', err);
    return { code: 500, message: '获取行程失败' };
  }
};
