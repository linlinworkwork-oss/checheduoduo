import { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import './time-picker.scss';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
/** 分钟档位：精确到 5 分钟，点选即可，无需拖动滚轮 */
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

interface Props {
  open: boolean;
  value: string; // 'HH:mm' 或空
  title: string;
  onClose: () => void;
  onConfirm: (v: string) => void;
}

/**
 * 底部弹出的精确时间选择器（替代滚轮）。
 * 先点「小时」再点「分钟」，最后点「确定」；全部是点选，不存在滚轮漂移问题。
 */
export default function TimePicker({ open, value, title, onClose, onConfirm }: Props) {
  const [hour, setHour] = useState('');
  const [min, setMin] = useState('');

  // 每次打开时用当前值初始化草稿（就近吸附到 5 分钟档位）
  useEffect(() => {
    if (!open) return;
    const m = /^(\d{1,2}):(\d{1,2})$/.exec(value || '');
    let h = m ? m[1] : '';
    let mi = m ? m[2] : '';
    if (h) h = String(Number(h)).padStart(2, '0');
    if (mi) {
      const n = Number(mi);
      mi = String(Math.min(55, Math.round(n / 5) * 5)).padStart(2, '0');
    }
    setHour(h);
    setMin(mi);
  }, [open, value]);

  if (!open) return null;

  const ready = !!(hour && min);
  const confirm = () => {
    if (ready) onConfirm(`${hour}:${min}`);
  };

  return (
    <View className="time-picker">
      <View className="time-picker__mask" onClick={onClose} />
      <View className="time-picker__sheet">
        <View className="time-picker__head">
          <Text className="time-picker__head-btn" onClick={onClose}>
            取消
          </Text>
          <Text className="time-picker__head-title">{title}</Text>
          <Text
            className={`time-picker__head-btn ${ready ? 'time-picker__head-ok' : 'time-picker__head-ok--off'}`}
            onClick={confirm}
          >
            确定
          </Text>
        </View>

        <View className="time-picker__preview">
          <Text className={`time-picker__preview-txt ${ready ? '' : 'time-picker__preview-txt--empty'}`}>
            {ready ? `${hour}:${min}` : '--:--'}
          </Text>
          <Text className="time-picker__preview-hint">点选即可，精确到 5 分钟</Text>
        </View>

        <View className="time-picker__group">
          <Text className="time-picker__group-label">小时</Text>
          <View className="time-picker__grid">
            {HOURS.map((h) => (
              <View key={h} className="time-picker__cell">
                <View
                  className={`time-picker__chip ${hour === h ? 'time-picker__chip--on' : ''}`}
                  onClick={() => setHour(h)}
                >
                  <Text>{h}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="time-picker__group">
          <Text className="time-picker__group-label">分钟</Text>
          <View className="time-picker__grid">
            {MINUTES.map((m) => (
              <View key={m} className="time-picker__cell">
                <View
                  className={`time-picker__chip ${min === m ? 'time-picker__chip--on' : ''}`}
                  onClick={() => setMin(m)}
                >
                  <Text>{m}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="time-picker__safe" />
      </View>
    </View>
  );
}
