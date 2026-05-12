import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useTripStore } from '../../stores/tripStore';
import { useUserStore } from '../../stores/userStore';
import Avatar from '../../components/ui/avatar';
import { LUGGAGE_SIZE_MAP, LUGGAGE_OPTIONS } from '../../lib/constants';
import './index.scss';

export default function Detail() {
  const router = useRouter();
  const { id } = router.params;
  const { trips, myCreatedTrips, myJoinedTrips, myCompletedTrips, joinTrip, leaveTrip, cancelTrip, completeTrip } = useTripStore();
  const { user } = useUserStore();
  const [joining, setJoining] = useState(false);

  const trip =
    trips.find((t) => t._id === id) ||
    myCreatedTrips.find((t) => t._id === id) ||
    myJoinedTrips.find((t) => t._id === id) ||
    myCompletedTrips.find((t) => t._id === id);

  if (!trip) {
    return (
      <View className="pg-detail">
        <View className="det-empty">
          <Text className="det-empty__icon">🫥</Text>
          <Text className="det-empty__text">行程不存在或已删除</Text>
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
  const departureEndTime = new Date(`${trip.departureDate}T${trip.departureTimeEnd}:00`).getTime();
  const isPastDeparture = Date.now() >= departureEndTime;

  const handleJoin = async () => {
    if (!trip?._id) { Taro.showToast({ title: '行程数据异常', icon: 'error' }); return; }
    if (!user?.nickName || !user?.phone) {
      Taro.showToast({ title: '请先在"我的"完善昵称和手机号', icon: 'none' });
      return;
    }
    const luggageLabels = LUGGAGE_OPTIONS.map((l) => l.label);
    const luggageValues = LUGGAGE_OPTIONS.map((l) => l.value);
    try {
      const res = await Taro.showActionSheet({
        itemList: luggageLabels,
        itemColor: '#1a1a1c',
      });
      const luggageSize = luggageValues[res.tapIndex];

      const departureEnd = new Date(`${trip.departureDate}T${trip.departureTimeEnd}:00`).getTime();
      const minutesLeft = Math.round((departureEnd - Date.now()) / 60000);
      if (minutesLeft <= 20 && minutesLeft > 0) {
        const confirmed = await Taro.showModal({
          title: '临近出发时间',
          content: `该行程最晚出发时间还剩 ${minutesLeft} 分钟，确定加入吗？`,
          confirmText: '确定加入',
        });
        if (!confirmed.confirm) return;
      }

      setJoining(true);
      try {
        await joinTrip(trip._id, luggageSize);
        Taro.showToast({ title: '加入成功', icon: 'success' });
      } catch (err: any) {
        Taro.showToast({ title: err.message || '加入失败', icon: 'error' });
      } finally {
        setJoining(false);
      }
    } catch {
      // user cancelled action sheet
    }
  };

  const handleLeave = async () => {
    if (!trip?._id) { Taro.showToast({ title: '行程数据异常', icon: 'error' }); return; }
    const r = await Taro.showModal({ title: '退出行程', content: '确定退出吗？' });
    if (!r.confirm) return;
    try {
      await leaveTrip(trip._id);
      Taro.showToast({ title: '已退出', icon: 'success' });
    } catch (err: any) {
      Taro.showToast({ title: err.message || '失败', icon: 'error' });
    }
  };

  const handleComplete = async () => {
    if (!trip?._id) { Taro.showToast({ title: '行程数据异常', icon: 'error' }); return; }
    const r = await Taro.showModal({ title: '标记完成', content: '确定将该行程标记为已完成吗？仅对你生效。' });
    if (!r.confirm) return;
    try {
      await completeTrip(trip._id);
      Taro.showToast({ title: '已标记完成', icon: 'success' });
    } catch (err: any) {
      Taro.showToast({ title: err.message || '操作失败', icon: 'error' });
    }
  };

  const handleCancel = async () => {
    if (!trip?._id) { Taro.showToast({ title: '行程数据异常', icon: 'error' }); return; }
    const r = await Taro.showModal({ title: '取消行程', content: '确定取消吗？已加入的同学会看到。' });
    if (!r.confirm) return;
    try {
      await cancelTrip(trip._id);
      Taro.showToast({ title: '已取消', icon: 'success' });
      Taro.navigateBack();
    } catch (err: any) {
      Taro.showToast({ title: err.message || '失败', icon: 'error' });
    }
  };

  return (
    <View className="pg-detail">
      {/* Hero: Route */}
      <View className="det-hero">
        <View className="det-hero__glow det-hero__glow--top" />
        <View className="det-hero__glow det-hero__glow--bot" />

        <View className={`det-hero__badge ${isFull || isCancelled ? 'det-hero__badge--off' : ''}`}>
          <Text>{isCancelled ? '已取消' : isFull ? '已满员' : '拼车中'}</Text>
        </View>

        <View className="det-hero__route">
          <View className="det-hero__node">
            <View className="det-hero__dot det-hero__dot--from" />
            <View>
              <Text className="det-hero__time">{trip.departureDate} {trip.departureTimeStart}</Text>
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
            <Text className="det-card__sub">
              {trip.creator.gender === 'female' ? '女' : '男'}
              {isParticipant && trip.creator.phone ? ` · ${trip.creator.phone}` : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Passengers */}
      <View className="det-card">
        <Text className="det-card__title">同行伙伴 · {trip.currentPassengers}/{trip.maxPassengers}</Text>
        {trip.passengers.map((p) => (
          <View key={p.userId} className="det-pass">
            <Avatar src={p.avatarUrl} size={32} name={p.nickName} />
            <View className="det-pass__info">
              <View className="det-pass__name-row">
                <Text className="det-pass__name">{p.nickName || '同学'}</Text>
                {p.userId === trip.creatorId && (
                  <View className="det-pass__tag"><Text>发起人</Text></View>
                )}
              </View>
              <Text className="det-pass__meta">
                {p.gender === 'female' ? '女' : '男'} · {LUGGAGE_SIZE_MAP[p.luggageSize]}
                {isParticipant && p.phone ? ` · ${p.phone}` : ''}
              </Text>
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
