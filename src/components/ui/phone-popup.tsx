import { useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '../../stores/userStore';
import './phone-popup.scss';

export default function PhonePopup() {
  const { user, loading, updateProfile } = useUserStore();
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [skipped, setSkipped] = useState(false);

  // Don't show while still loading user data, or if phone already set, or user explicitly skipped
  if (loading || user?.phone || skipped) return null;

  const save = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ phone });
      Taro.showToast({ title: '已保存', icon: 'success' });
    } catch {
      Taro.showToast({ title: '保存失败', icon: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    setSkipped(true);
  };

  return (
    <View className="phone-popup">
      <View className="phone-popup__mask" />
      <View className="phone-popup__card">
        <Text className="phone-popup__icon">📱</Text>
        <Text className="phone-popup__title">填写手机号</Text>
        <Text className="phone-popup__desc">方便拼车时联系你</Text>
        <Input
          className="phone-popup__input"
          type="number"
          maxlength={11}
          placeholder="输入手机号"
          placeholderStyle="color:#c7c7cc"
          value={phone}
          onInput={(e: any) => setPhone(e.detail.value)}
          onConfirm={save}
        />
        <View
          className={`phone-popup__btn ${saving ? 'phone-popup__btn--loading' : ''}`}
          hoverClass="phone-popup__btn--hover"
          onClick={save}
        >
          <Text className="phone-popup__btn-text">{saving ? '保存中...' : '确认'}</Text>
        </View>
        <View className="phone-popup__skip" onClick={skip}>
          <Text className="phone-popup__skip-text">跳过，稍后填写</Text>
        </View>
      </View>
    </View>
  );
}
