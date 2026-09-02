import Taro from '@tarojs/taro';
import { Trip } from '../stores/tripStore';

type DepartureWindow = Pick<Trip, 'departureDate' | 'departureTimeEnd'> & {
  /** 绝对时间戳（ms），由前端按设备时区计算后随行程存储，避免云函数 UTC 时区偏差。 */
  departureEndTime?: number;
};

/**
 * Timestamp (ms) of the trip's departure window end.
 * Prefers the client-computed absolute timestamp; falls back to parsing the
 * date/time strings in the local timezone. NaN if the trip is malformed.
 */
export function departureEndTime(trip: DepartureWindow): number {
  if (typeof trip.departureEndTime === 'number' && !isNaN(trip.departureEndTime)) {
    return trip.departureEndTime;
  }
  return new Date(`${trip.departureDate}T${trip.departureTimeEnd}:00`).getTime();
}

/** Whole minutes until the departure window ends, or null if malformed. */
export function minutesUntilDeparture(trip: DepartureWindow): number | null {
  const end = departureEndTime(trip);
  if (isNaN(end)) return null;
  return Math.round((end - Date.now()) / 60000);
}

/** True once the departure window has ended (or the trip is malformed). */
export function isDepartureEnded(trip: DepartureWindow): boolean {
  const end = departureEndTime(trip);
  return !isNaN(end) && Date.now() >= end;
}

/**
 * Warn the user before publishing / joining a trip whose departure window
 * ends within `thresholdMinutes`. Resolves true if the action may proceed.
 */
export async function confirmIfDepartingSoon(
  trip: DepartureWindow,
  action: '发布' | '加入',
  thresholdMinutes = 20,
): Promise<boolean> {
  const minutesLeft = minutesUntilDeparture(trip);
  if (minutesLeft === null || minutesLeft <= 0 || minutesLeft > thresholdMinutes) return true;
  const r = await Taro.showModal({
    title: '临近出发时间',
    content: `最晚出发时间还剩 ${minutesLeft} 分钟，确定${action}吗？`,
    confirmText: `确定${action}`,
  });
  return r.confirm;
}
