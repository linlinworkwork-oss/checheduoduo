const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

async function autoCompleteTrip(trip, openid) {
  const list = trip.completedBy || [];
  if (list.includes(openid)) return true;

  if (!trip.departureDate || !trip.departureTimeEnd) return false;
  // Prefer the client-computed absolute timestamp (timezone-safe);
  // fall back to parsing the strings for legacy trips.
  const endTime =
    typeof trip.departureEndTime === 'number' && trip.departureEndTime > 0
      ? trip.departureEndTime
      : new Date(`${trip.departureDate}T${trip.departureTimeEnd}:00`).getTime();
  if (isNaN(endTime)) return false;

  const now = Date.now();
  if (now <= endTime + TWO_HOURS_MS) return false;

  await db.collection('trips').doc(trip._id).update({
    data: { completedBy: _.push(openid) },
  });
  trip.completedBy = [...list, openid];
  return true;
}

exports.main = async (event) => {
  // Web 端（CloudBase SDK 匿名登录）拿不到微信 OPENID，用前端传入的 _uid 兜底
  const { OPENID: wxOpenid } = cloud.getWXContext();
  const OPENID = wxOpenid || event._uid;
  if (!OPENID) return { code: 401, message: '请先登录' };

  try {
    const tripQuery = db.collection('trips');

    // Trips I created (excluding cancelled)
    const { data: createdRaw } = await tripQuery
      .where({
        creatorId: OPENID,
        status: _.neq('cancelled'),
      })
      .orderBy('createdAt', 'desc')
      .get();

    // Trips I joined (not my own, not cancelled)
    const { data: joinedRaw } = await tripQuery
      .where({
        'passengers.userId': OPENID,
        creatorId: _.neq(OPENID),
        status: _.neq('cancelled'),
      })
      .orderBy('createdAt', 'desc')
      .get();

    // Trips I completed
    const { data: completed } = await tripQuery
      .where({
        completedBy: OPENID,
        status: _.neq('cancelled'),
      })
      .orderBy('createdAt', 'desc')
      .get();

    const created = [];
    const joined = [];
    const autoCompleted = [];

    for (const t of createdRaw) {
      if (await autoCompleteTrip(t, OPENID)) {
        autoCompleted.push(t);
      } else {
        created.push(t);
      }
    }

    for (const t of joinedRaw) {
      if (await autoCompleteTrip(t, OPENID)) {
        autoCompleted.push(t);
      } else {
        joined.push(t);
      }
    }

    const seen = new Set();
    const deduped = [...autoCompleted, ...completed].filter((t) => {
      if (seen.has(t._id)) return false;
      seen.add(t._id);
      return true;
    });

    return { code: 0, created, joined, completed: deduped };
  } catch (err) {
    console.error('[getMyTrips] Error:', err);
    return { code: 500, message: '查询失败' };
  }
};
