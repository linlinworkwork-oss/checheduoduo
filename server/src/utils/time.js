/**
 * 行程时间工具。
 *
 * 关键约定：departureEndTime 是「前端按设备时区计算好的绝对时间戳（ms）」，
 * 后端所有时间过滤只比较数字。但老数据（云开发迁移而来）可能缺该字段，
 * 此时按北京时间的显式解析兜底：App 目标用户在中国，
 * departureDate/departureTimeEnd 字符串即北京时间，用 +08:00 解析
 * 与客户端算法一致（不依赖服务器本地时区，避免云函数时代 UTC 8 小时偏差复现）。
 */

const BEIJING_OFFSET = '+08:00';

/**
 * 计算行程的绝对结束时间戳（ms）。优先 departureEndTime（数字），
 * 缺失时按北京时间解析 departureDate + departureTimeEnd 字符串。
 * 无法解析返回 NaN。
 */
function resolveEndTimeMs(trip) {
  if (trip && typeof trip.departureEndTime === 'number' && trip.departureEndTime > 0) {
    return trip.departureEndTime;
  }
  if (!trip || !trip.departureDate || !trip.departureTimeEnd) return NaN;
  const t = new Date(`${trip.departureDate}T${trip.departureTimeEnd}:00${BEIJING_OFFSET}`).getTime();
  return Number.isNaN(t) ? NaN : t;
}

/**
 * getMyTrips 的自动完成逻辑：
 * 行程出发窗口结束超过 2 小时后，参与者/发起人自动视为完成（进入「我完成的」列表）。
 */
const AUTO_COMPLETE_GRACE_MS = 2 * 60 * 60 * 1000;

function shouldAutoComplete(trip, openid) {
  const list = trip.completedBy || [];
  if (list.includes(openid)) return false;
  const endTime = resolveEndTimeMs(trip);
  if (Number.isNaN(endTime)) return false;
  return Date.now() > endTime + AUTO_COMPLETE_GRACE_MS;
}

module.exports = { resolveEndTimeMs, shouldAutoComplete, AUTO_COMPLETE_GRACE_MS };
