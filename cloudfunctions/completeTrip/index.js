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

    const isCreator = trip.creatorId === OPENID;
    const isPassenger = trip.passengers.some((p) => p.userId === OPENID);
    if (!isCreator && !isPassenger) {
      return { code: 403, message: '只有行程参与者才能标记完成' };
    }

    const alreadyCompleted = (trip.completedBy || []).includes(OPENID);
    if (alreadyCompleted) {
      return { code: 0, message: '已标记完成', completedBy: trip.completedBy };
    }

    const completedBy = _.push(OPENID);

    await trips.doc(tripId).update({
      data: { completedBy },
    });

    return { code: 0, completedBy: [...(trip.completedBy || []), OPENID] };
  } catch (err) {
    console.error('[completeTrip] Error:', err);
    return { code: 500, message: '操作失败' };
  }
};
