const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.main = async (event) => {
  const {
    departureDate,
    keyword,
    departureNames,
    arrivalNames,
    hideFull,
    page = 1,
    pageSize = 20,
  } = event;

  try {
    const andArr = [];

    // Status filter
    if (hideFull) {
      andArr.push({ status: 'open' });
    } else {
      andArr.push({ status: _.in(['open', 'full']) });
    }

    // Date filter
    if (departureDate) {
      andArr.push({ departureDate });
    }

    // Departure location — prefix match
    if (departureNames && departureNames.length > 0) {
      andArr.push(
        _.or(
          departureNames.map((name) => ({
            'departureLocation.name': db.RegExp({ regexp: `^${escapeRegex(name)}`, options: 'i' }),
          })),
        ),
      );
    }

    // Arrival location — prefix match
    if (arrivalNames && arrivalNames.length > 0) {
      andArr.push(
        _.or(
          arrivalNames.map((name) => ({
            'arrivalLocation.name': db.RegExp({ regexp: `^${escapeRegex(name)}`, options: 'i' }),
          })),
        ),
      );
    }

    // Keyword search
    if (keyword) {
      const kwRegex = db.RegExp({
        regexp: escapeRegex(keyword),
        options: 'i',
      });
      andArr.push({
        $or: [
          { 'departureLocation.name': kwRegex },
          { 'arrivalLocation.name': kwRegex },
        ],
      });
    }

    const query = db.collection('trips').where(_.and(andArr));

    // Use limit+1 trick instead of expensive count()
    const { data } = await query
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize + 1)
      .get();

    // Filter out trips whose departure window ended more than 20 min ago
    const cutoff = Date.now() - 20 * 60 * 1000;
    const filtered = data.filter((trip) => {
      if (!trip.departureDate || !trip.departureTimeEnd) return true;
      const endTime = new Date(`${trip.departureDate}T${trip.departureTimeEnd}:00`).getTime();
      return !isNaN(endTime) && endTime > cutoff;
    });

    const trips = filtered.slice(0, pageSize);
    const hasMore = filtered.length > pageSize;

    return { code: 0, trips, hasMore };
  } catch (err) {
    console.error('[listTrips] Error:', err);
    return { code: 500, message: '查询行程失败' };
  }
};
