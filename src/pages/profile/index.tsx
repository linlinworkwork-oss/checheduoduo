import { useState, useEffect } from 'react';
import { View, Text, Input, Picker } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useUserStore } from '../../stores/userStore';
import { useTripStore, Trip } from '../../stores/tripStore';
import { GENDER_OPTIONS } from '../../lib/constants';
import Avatar from '../../components/ui/avatar';
import './index.scss';

export default function Profile() {
  const { user, loading, isLogin, updateProfile } = useUserStore();
  const { myCreatedTrips, myJoinedTrips, myCompletedTrips, getMyTrips } = useTripStore();
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ nickName: '', phone: '', gender: 'female' as const });

  useDidShow(() => {
    if (isLogin) getMyTrips();
  });

  useEffect(() => {
    if (user) {
      setEdit({ nickName: user.nickName || '', phone: user.phone || '', gender: user.gender });
    }
  }, [user]);

  const save = async () => {
    await updateProfile(edit);
    setEditing(false);
    Taro.showToast({ title: '已保存', icon: 'success' });
  };

  const goDetail = (t: Trip) => Taro.navigateTo({ url: `/pages/detail/index?id=${t._id}` });

  if (loading) {
    return <View className="pg-profile"><View className="pro-empty"><Text>加载中...</Text></View></View>;
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
                placeholder="手机号（方便拼车联系）"
                type="number"
                maxlength={11}
                value={edit.phone}
                onInput={(e: any) => setEdit((p) => ({ ...p, phone: e.detail.value }))}
              />
              <View className="pro-edit__row">
                <Picker
                  mode="selector"
                  range={GENDER_OPTIONS.map((g) => g.label)}
                  value={GENDER_OPTIONS.findIndex((g) => g.value === edit.gender)}
                  onChange={(e: any) => setEdit((p) => ({ ...p, gender: e.detail.value === 0 ? 'male' : 'female' }))}
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
                <Text className="pro-info__no-phone">点击编辑填写手机号</Text>
              )}
              <View className="pro-info__tags">
                <Text className="pro-info__tag">{GENDER_OPTIONS.find((g) => g.value === user?.gender)?.label}</Text>
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
          myCreatedTrips.filter((t) => t.status !== 'cancelled').map((t) => (
            <View key={t._id} className="pro-trip" onClick={() => goDetail(t)}>
              <View className="pro-trip__route">
                <Text className="pro-trip__from">{t.departureLocation.name}</Text>
                <Text className="pro-trip__arrow">→</Text>
                <Text className="pro-trip__to">{t.arrivalLocation.name}</Text>
              </View>
              <View className="pro-trip__meta">
                <Text className="pro-trip__date">{t.departureDate}</Text>
                <Text className={`pro-trip__status ${t.status === 'full' ? 'pro-trip__status--full' : ''}`}>
                  {t.status === 'open' ? '拼车中' : t.status === 'full' ? '已满员' : '已取消'}
                </Text>
              </View>
            </View>
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
          myJoinedTrips.filter((t) => t.status !== 'cancelled').map((t) => (
            <View key={t._id} className="pro-trip" onClick={() => goDetail(t)}>
              <View className="pro-trip__route">
                <Text className="pro-trip__from">{t.departureLocation.name}</Text>
                <Text className="pro-trip__arrow">→</Text>
                <Text className="pro-trip__to">{t.arrivalLocation.name}</Text>
              </View>
              <View className="pro-trip__meta">
                <Text className="pro-trip__date">{t.departureDate}</Text>
                <Text className="pro-trip__status">
                  {t.currentPassengers}/{t.maxPassengers}人
                </Text>
              </View>
            </View>
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
            <View key={t._id} className="pro-trip pro-trip--done" onClick={() => goDetail(t)}>
              <View className="pro-trip__route">
                <Text className="pro-trip__from">{t.departureLocation.name}</Text>
                <Text className="pro-trip__arrow">→</Text>
                <Text className="pro-trip__to">{t.arrivalLocation.name}</Text>
              </View>
              <View className="pro-trip__meta">
                <Text className="pro-trip__date">{t.departureDate}</Text>
                <View className="pro-trip__done-tag"><Text>✓ 已完成</Text></View>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 50 }} />
    </View>
  );
}
