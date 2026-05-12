const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: 401, message: '请先登录' };

  try {
    // Trips I created (excluding cancelled)
    const { data: createdRaw } = await db
      .collection('trips')
      .where({
        creatorId: OPENID,
        status: _.neq('cancelled'),
      })
      .orderBy('createdAt', 'desc')
      .get();

    // Trips I joined (not my own, not cancelled)
    const { data: joinedRaw } = await db
      .collection('trips')
      .where({
        'passengers.userId': OPENID,
        creatorId: _.neq(OPENID),
        status: _.neq('cancelled'),
      })
      .orderBy('createdAt', 'desc')
      .get();

    // Trips I completed
    const { data: completed } = await db
      .collection('trips')
      .where({
        completedBy: OPENID,
        status: _.neq('cancelled'),
      })
      .orderBy('createdAt', 'desc')
      .get();

    // Auto-complete trips past departureEnd + 2h
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    const autoComplete = async (trip) => {
      const list = trip.completedBy || [];
      // Already completed by me — move to completed list regardless of time
      if (list.includes(OPENID)) return true;

      // Not completed and past departureEnd + 2h — auto-complete
      if (!trip.departureDate || !trip.departureTimeEnd) return false;
      const endTime = new Date(`${trip.departureDate}T${trip.departureTimeEnd}:00`).getTime();
      if (isNaN(endTime) || now <= endTime + TWO_HOURS) return false;

      await db.collection('trips').doc(trip._id).update({
        data: { completedBy: _.push([OPENID]) },
      });
      trip.completedBy = [...list, OPENID];
      return true;
    };

    const created = [];
    const joined = [];
    const autoCompleted = [];

    for (const t of createdRaw) {
      if (await autoComplete(t)) {
        autoCompleted.push(t);
      } else {
        created.push(t);
      }
    }

    for (const t of joinedRaw) {
      if (await autoComplete(t)) {
        autoCompleted.push(t);
      } else {
        joined.push(t);
      }
    }

    const allCompleted = [...autoCompleted, ...completed];
    const seen = new Set();
    const deduped = allCompleted.filter((t) => {
      if (seen.has(t._id)) return false;
      seen.add(t._id);
      return true;
    });

    return {
      code: 0,
      created,
      joined,
      completed: deduped,
    };
  } catch (err) {
    console.error('[getMyTrips] Error:', err);
    return { code: 500, message: '查询失败' };
  }
};
