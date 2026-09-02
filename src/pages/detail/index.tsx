import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter, useDidShow, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { useTripStore, Trip } from '../../stores/tripStore';
import { useUserStore } from '../../stores/userStore';
import Avatar from '../../components/ui/avatar';
import { LUGGAGE_SIZE_MAP, LUGGAGE_OPTIONS, GENDER_MAP, TRIP_STATUS_MAP } from '../../lib/constants';
import { confirmIfDepartingSoon, isDepartureEnded } from '../../lib/trip';
import './index.scss';

const LUGGAGE_LABELS = LUGGAGE_OPTIONS.map((l) => l.label);
const LUGGAGE_VALUES = LUGGAGE_OPTIONS.map((l) => l.value);

/** 拼接同行者可见的联系方式（手机号 / 学号 / 微信号），无则返回空串。 */
function contactText(c: { phone?: string; studentId?: string; wechatId?: string }): string {
  return [
    c.phone && `手机 ${c.phone}`,
    c.studentId && `学号 ${c.studentId}`,
    c.wechatId && `微信 ${c.wechatId}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Guard trip._id, show confirmation modal, execute action, toast result. */
async function guardedAction(
  tripId: string | undefined,
  title: string,
  content: string,
  fn: () => Promise<void>,
  ok: string,
  err: string,
  after?: () => void,
) {
  if (!tripId) {
    Taro.showToast({ title: '行程数据异常', icon: 'error' });
    return;
  }
  const r = await Taro.showModal({ title, content });
  if (!r.confirm) return;
  try {
    await fn();
    Taro.showToast({ title: ok, icon: 'success' });
    after?.();
  } catch (e: unknown) {
    Taro.showToast({ title: (e instanceof Error ? e.message : '') || err, icon: 'error' });
  }
}

export default function Detail() {
  const router = useRouter();
  const { id } = router.params;
  const { getTrip, joinTrip, leaveTrip, cancelTrip, completeTrip } = useTripStore();
  const { user } = useUserStore();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [missing, setMissing] = useState(false);
  const [joining, setJoining] = useState(false);

  const load = async () => {
    if (!id) {
      setMissing(true);
      return;
    }
    try {
      setTrip(await getTrip(id));
      setMissing(false);
    } catch {
      // Only report "missing" when we have nothing to show; otherwise keep the stale trip.
      if (trip === null) setMissing(true);
    }
  };

  useDidShow(load);

  // Share menu — required for the "转发" button to be available.
  // Shares the concrete trip; recipients open the detail page directly.
  useShareAppMessage(() => ({
    title: trip
      ? `${trip.departureLocation.name} → ${trip.arrivalLocation.name} 拼车，一起出发吗？`
      : '校园拼车',
    path: `/pages/detail/index?id=${id}`,
  }));
  useShareTimeline(() => ({
    title: trip
      ? `${trip.departureLocation.name} → ${trip.arrivalLocation.name} 拼车`
      : '校园拼车',
    query: id ? `id=${id}` : '',
  }));

  if (!trip || missing) {
    return (
      <View className="pg-detail">
        <View className="det-empty">
          <Text className="det-empty__icon">🫥</Text>
          <Text className="det-empty__text">
            {trip === null && !missing ? '加载中...' : '行程不存在或已删除'}
          </Text>
        </View>
      </View>
    );
  }

  const isCreator = user?.openid === trip.creatorId;
  const isMember = trip.passengers.some((p) => p.userId === user?.openid);
  const isParticipant = isCreator || isMember;
  const isFull = trip.status === 'full';
  const isCancelled = trip.status === 'cancelled';
  const isCompletedByMe = (trip.completedBy || []).includes(user?.openid || '');
  const isPastDeparture = isDepartureEnded(trip);

  const handleJoin = async () => {
    if (!user?.nickName || !user?.phone) {
      Taro.showToast({ title: '请先在"我的"完善昵称和手机号', icon: 'none' });
      return;
    }
    try {
      const res = await Taro.showActionSheet({ itemList: LUGGAGE_LABELS, itemColor: '#1a1a1c' });
      const luggageSize = LUGGAGE_VALUES[res.tapIndex];

      if (!(await confirmIfDepartingSoon(trip, '加入'))) return;

      setJoining(true);
      try {
        setTrip(await joinTrip(trip._id, luggageSize));
        Taro.showToast({ title: '加入成功', icon: 'success' });
      } catch (e: unknown) {
        Taro.showToast({ title: (e instanceof Error ? e.message : '') || '加入失败', icon: 'error' });
      } finally {
        setJoining(false);
      }
    } catch {
      /* user cancelled action sheet */
    }
  };

  const handleLeave = () =>
    guardedAction(
      trip._id,
      '退出行程',
      '确定退出吗？',
      async () => {
        setTrip(await leaveTrip(trip._id));
      },
      '已退出',
      '失败',
    );

  const handleComplete = () =>
    guardedAction(
      trip._id,
      '标记完成',
      '确定将该行程标记为已完成吗？仅对你生效。',
      async () => {
        const completedBy = await completeTrip(trip._id);
        setTrip({ ...trip, completedBy });
      },
      '已标记完成',
      '操作失败',
    );

  const handleCancel = () =>
    guardedAction(
      trip._id,
      '取消行程',
      '确定取消吗？已加入的同学会看到。',
      async () => {
        await cancelTrip(trip._id);
      },
      '已取消',
      '失败',
      () => {
        Taro.navigateBack();
      },
    );

  return (
    <View className="pg-detail">
      {/* Hero: Route */}
      <View className="det-hero">
        <View className="det-hero__glow det-hero__glow--top" />
        <View className="det-hero__glow det-hero__glow--bot" />

        <View className={`det-hero__badge ${isFull || isCancelled ? 'det-hero__badge--off' : ''}`}>
          <Text>{TRIP_STATUS_MAP[trip.status]}</Text>
        </View>

        <View className="det-hero__route">
          <View className="det-hero__node">
            <View className="det-hero__dot det-hero__dot--from" />
            <View>
              <Text className="det-hero__time">
                {trip.departureDate} {trip.departureTimeStart}
              </Text>
              <Text className="det-hero__place">{trip.departureLocation.name}</Text>
            </View>
          </View>
          <View className="det-hero__gap">
            <Text className="det-hero__gap-text">
              出发区间 {trip.departureTimeStart} — {trip.departureTimeEnd}
            </Text>
          </View>
          <View className="det-hero__node">
            <View className="det-hero__dot det-hero__dot--to" />
            <View>
              <Text className="det-hero__place">{trip.arrivalLocation.name}</Text>
              {trip.ticketTime ? <Text className="det-hero__ticket">🎫 票面时间 {trip.ticketTime}</Text> : null}
            </View>
          </View>
        </View>
      </View>

      {/* Creator card */}
      <View className="det-card">
        <Text className="det-card__title">发起人</Text>
        <View className="det-card__creator">
          <Avatar src={trip.creator.avatarUrl} size={36} name={trip.creator.nickName} />
          <View className="det-card__info">
            <Text className="det-card__name">{trip.creator.nickName || '同学'}</Text>
            <Text className="det-card__sub">{GENDER_MAP[trip.creator.gender]}</Text>
            {isParticipant && contactText(trip.creator) ? (
              <Text className="det-card__sub">{contactText(trip.creator)}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Note — optional */}
      {trip.note ? (
        <View className="det-card">
          <Text className="det-card__title">备注</Text>
          <Text className="det-note">{trip.note}</Text>
        </View>
      ) : null}

      {/* Passengers */}
      <View className="det-card">
        <Text className="det-card__title">
          同行伙伴 · {trip.currentPassengers}/{trip.maxPassengers}
        </Text>
        {trip.passengers.map((p) => (
          <View key={p.userId} className="det-pass">
            <Avatar src={p.avatarUrl} size={32} name={p.nickName} />
            <View className="det-pass__info">
              <View className="det-pass__name-row">
                <Text className="det-pass__name">{p.nickName || '同学'}</Text>
                {p.userId === trip.creatorId && (
                  <View className="det-pass__tag">
                    <Text>发起人</Text>
                  </View>
                )}
              </View>
              <Text className="det-pass__meta">
                {GENDER_MAP[p.gender]} · {LUGGAGE_SIZE_MAP[p.luggageSize]}
              </Text>
              {isParticipant && contactText(p) ? (
                <Text className="det-pass__meta">{contactText(p)}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {/* Actions */}
      {!isCancelled && (
        <View className="det-actions">
          {isCreator ? (
            <View className="det-btn det-btn--danger" onClick={handleCancel}>
              <Text className="det-btn__text">取消行程</Text>
            </View>
          ) : isMember ? (
            <View className="det-btn det-btn--outline" onClick={handleLeave}>
              <Text className="det-btn__text">退出行程</Text>
            </View>
          ) : !isFull ? (
            <View className="det-btn det-btn--primary" onClick={handleJoin}>
              <Text className="det-btn__text">{joining ? '加入中…' : '加入拼车'}</Text>
            </View>
          ) : null}

          {isParticipant && isPastDeparture && !isCompletedByMe && (
            <View className="det-btn det-btn--complete" onClick={handleComplete}>
              <Text className="det-btn__text">标记完成</Text>
            </View>
          )}

          {isCompletedByMe && (
            <View className="det-btn det-btn--done">
              <Text className="det-btn__text">✓ 已完成</Text>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 50 }} />
    </View>
  );
}
