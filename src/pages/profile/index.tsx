import { useState, useEffect, useRef } from 'react';
import { View, Text, Input, Picker } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { useUserStore } from '../../stores/userStore';
import { useTripStore } from '../../stores/tripStore';
import { GENDER_OPTIONS, TRIP_STATUS_MAP } from '../../lib/constants';
import Avatar from '../../components/ui/avatar';
import TripRow from '../../components/trip-row';
import './index.scss';

export default function Profile() {
  const { user, loading, isLogin, updateProfile } = useUserStore();
  const { myCreatedTrips, myJoinedTrips, myCompletedTrips, getMyTrips } = useTripStore();
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<{
    nickName: string;
    phone: string;
    gender: 'male' | 'female';
    studentId: string;
    wechatId: string;
  }>({
    nickName: '',
    phone: '',
    gender: 'female',
    studentId: '',
    wechatId: '',
  });

  // 记录 useDidShow 是否因尚未登录而跳过（登录后由 effect 补拉一次）
  const loginRefetchPending = useRef(false);

  useDidShow(() => {
    if (isLogin) {
      getMyTrips();
    } else {
      // 登录完成前进入本页：标记待补拉，等 isLogin 变 true 后拉一次
      loginRefetchPending.current = true;
    }
  });

  // 修复：登录完成前就进入本页时 useDidShow 已过（isLogin=false 被跳过），
  // 这里在登录成功后补拉一次「我的行程」（仅当确实跳过时）。
  useEffect(() => {
    if (isLogin && loginRefetchPending.current) {
      loginRefetchPending.current = false;
      getMyTrips();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin]);

  // Share menu — required for the "转发" button to be available
  useShareAppMessage(() => ({
    title: '校园拼车 - 我的行程',
    path: '/pages/profile/index',
  }));
  useShareTimeline(() => ({
    title: '校园拼车 - 我的行程',
  }));

  usePullDownRefresh(() => {
    getMyTrips().finally(() => Taro.stopPullDownRefresh());
  });

  useEffect(() => {
    if (user) {
      setEdit({
        nickName: user.nickName || '',
        phone: user.phone || '',
        gender: user.gender,
        studentId: user.studentId || '',
        wechatId: user.wechatId || '',
      });
    }
  }, [user]);

  const save = async () => {
    if (!/^1\d{10}$/.test(edit.phone)) {
      Taro.showToast({ title: '手机号为必填项，请输入正确的手机号', icon: 'none' });
      return;
    }
    await updateProfile(edit);
    setEditing(false);
    Taro.showToast({ title: '已保存', icon: 'success' });
  };

  if (loading) {
    return (
      <View className="pg-profile">
        <View className="pro-empty">
          <Text>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="pg-profile">
      {/* Header */}
      <View className="pro-header">
        <View className="pro-header__bg" />
        <View className="pro-header__card">
          <View className="pro-header__avatar-wrap">
            <Avatar src={user?.avatarUrl} size={64} name={user?.nickName} />
          </View>
          {editing ? (
            <View className="pro-edit">
              <Input
                className="pro-edit__name"
                placeholder="你的昵称"
                value={edit.nickName}
                onInput={(e: any) => setEdit((p) => ({ ...p, nickName: e.detail.value }))}
              />
              <Input
                className="pro-edit__phone"
                placeholder="手机号（必填，方便拼车联系）"
                type="number"
                maxlength={11}
                value={edit.phone}
                onInput={(e: any) => setEdit((p) => ({ ...p, phone: e.detail.value }))}
              />
              <Input
                className="pro-edit__phone"
                placeholder="学号（选填）"
                value={edit.studentId}
                onInput={(e: any) => setEdit((p) => ({ ...p, studentId: e.detail.value }))}
              />
              <Input
                className="pro-edit__phone"
                placeholder="微信号（选填，拼车联系用）"
                value={edit.wechatId}
                onInput={(e: any) => setEdit((p) => ({ ...p, wechatId: e.detail.value }))}
              />
              <View className="pro-edit__row">
                <Picker
                  mode="selector"
                  range={GENDER_OPTIONS.map((g) => g.label)}
                  value={GENDER_OPTIONS.findIndex((g) => g.value === edit.gender)}
                  onChange={(e: any) =>
                    setEdit((p) => ({ ...p, gender: e.detail.value === 0 ? 'male' : 'female' }))
                  }
                >
                  <View className="pro-edit__chip">
                    <Text>{GENDER_OPTIONS.find((g) => g.value === edit.gender)?.label}</Text>
                  </View>
                </Picker>
              </View>
              <View className="pro-edit__btns">
                <View className="pro-btn pro-btn--pri" onClick={save}>
                  <Text className="pro-btn__text">保存</Text>
                </View>
                <View className="pro-btn pro-btn--sec" onClick={() => setEditing(false)}>
                  <Text className="pro-btn__text">取消</Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="pro-info">
              <Text className="pro-info__name">{user?.nickName || '未设置昵称'}</Text>
              {user?.phone ? (
                <Text className="pro-info__phone">{user.phone}</Text>
              ) : (
                <Text className="pro-info__no-phone">点击编辑填写手机号（必填）</Text>
              )}
              {(user?.studentId || user?.wechatId) && (
                <Text className="pro-info__phone">
                  {[user?.studentId && `学号 ${user.studentId}`, user?.wechatId && `微信 ${user.wechatId}`]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              )}
              <View className="pro-info__tags">
                <Text className="pro-info__tag">
                  {GENDER_OPTIONS.find((g) => g.value === user?.gender)?.label}
                </Text>
              </View>
              <View className="pro-btn pro-btn--sec" onClick={() => setEditing(true)}>
                <Text className="pro-btn__text">编辑资料</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Created trips */}
      <View className="pro-section">
        <Text className="pro-section__title">我创建的行程</Text>
        {myCreatedTrips.length === 0 ? (
          <View className="pro-empty-list">
            <Text className="pro-empty-list__text">还没有创建过行程</Text>
          </View>
        ) : (
          myCreatedTrips
            .filter((t) => t.status !== 'cancelled')
            .map((t) => (
              <TripRow key={t._id} trip={t}>
                <Text
                  className={`pro-status${t.status === 'full' ? ' pro-status--full' : ''}`}
                >
                  {TRIP_STATUS_MAP[t.status]}
                </Text>
              </TripRow>
            ))
        )}
      </View>

      {/* Joined trips */}
      <View className="pro-section">
        <Text className="pro-section__title">我加入的行程</Text>
        {myJoinedTrips.length === 0 ? (
          <View className="pro-empty-list">
            <Text className="pro-empty-list__text">还没有加入过行程</Text>
          </View>
        ) : (
          myJoinedTrips
            .filter((t) => t.status !== 'cancelled')
            .map((t) => (
              <TripRow key={t._id} trip={t}>
                <Text className="pro-status">
                  {t.currentPassengers}/{t.maxPassengers}人
                </Text>
              </TripRow>
            ))
        )}
      </View>

      {/* Completed trips */}
      <View className="pro-section">
        <Text className="pro-section__title">已完成的行程</Text>
        {myCompletedTrips.length === 0 ? (
          <View className="pro-empty-list">
            <Text className="pro-empty-list__text">还没有已完成的行程</Text>
          </View>
        ) : (
          myCompletedTrips.map((t) => (
            <TripRow key={t._id} trip={t} done>
              <View className="pro-done-tag">
                <Text>✓ 已完成</Text>
              </View>
            </TripRow>
          ))
        )}
      </View>

      <View style={{ height: 50 }} />
    </View>
  );
}
