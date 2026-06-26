import { useState, useMemo } from 'react';
import { View, Text, Textarea, Picker, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useTripStore } from '../../stores/tripStore';
import { MAX_PASSENGERS_OPTIONS, LUGGAGE_OPTIONS, LOCATION_OPTIONS } from '../../lib/constants';
import './index.scss';

interface FormData {
  departureDate: string;
  departureTimeStart: string;
  departureTimeEnd: string;
  departureName: string;
  departureAddress: string;
  departureLat: number;
  departureLng: number;
  arrivalName: string;
  arrivalAddress: string;
  arrivalLat: number;
  arrivalLng: number;
  ticketDate: string;
  ticketTime: string;
  maxPassengers: number;
  luggageSize: 'none' | 'small' | 'medium' | 'large' | 'xlarge';
  note: string;
}

const INITIAL: FormData = {
  departureDate: '', departureTimeStart: '', departureTimeEnd: '',
  departureName: '', departureAddress: '', departureLat: 0, departureLng: 0,
  arrivalName: '', arrivalAddress: '', arrivalLat: 0, arrivalLng: 0,
  ticketDate: '', ticketTime: '', maxPassengers: 2, luggageSize: 'medium', note: '',
};

export default function Create() {
  const { createTrip } = useTripStore();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const set = (f: keyof FormData, v: any) => {
    setForm((p) => {
      const next = { ...p, [f]: v };
      // Auto-sync ticket date when departure date changes,
      // but only if ticket date was empty or previously synced
      if (f === 'departureDate' && v && (!p.ticketDate || p.ticketDate === p.departureDate)) {
        next.ticketDate = v;
      }
      return next;
    });
    setErrors((p) => ({ ...p, [f]: '' }));
  };

  const makeLocHandler = (type: 'departure' | 'arrival') => (e: any) => {
    const idx = Number(e.detail.value);
    const option = LOCATION_OPTIONS[idx];

    const done = (name: string) => {
      set(`${type}Name` as any, name);
      set(`${type}Address` as any, name);
    };

    if (option.children?.length) {
      Taro.showActionSheet({
        itemList: option.children,
        success: (res) => done(`${option.name} ${option.children![res.tapIndex]}`),
      });
    } else if (option.customChild) {
      Taro.showModal({
        title: option.name,
        editable: true,
        placeholderText: '如：北门、东门...',
        success: (res) => {
          if (res.confirm && res.content) done(`${option.name} ${res.content}`);
        },
      });
    } else {
      done(option.name);
    }
  };

  const chooseLoc = (type: 'departure' | 'arrival') => () => {
    Taro.chooseLocation({
      latitude: 30.4757,
      longitude: 114.3873,
      success: (loc: any) => {
        const name = (form[`${type}Name` as keyof FormData] as string) || loc.name || loc.address || '';
        set(`${type}Name` as any, name);
        set(`${type}Address` as any, loc.address || name);
        set(`${type}Lat` as any, loc.latitude);
        set(`${type}Lng` as any, loc.longitude);
      },
      fail: () => {}, // user cancelled, ignore
    });
  };

  const progress = useMemo(() => {
    const keys: (keyof FormData)[] = [
      'departureDate', 'departureTimeStart', 'departureTimeEnd',
      'departureName', 'arrivalName',
    ];
    return Math.round((keys.filter((k) => !!form[k]).length / keys.length) * 100);
  }, [form]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const validate = (): boolean => {
    const e: any = {};
    if (!form.departureDate) e.departureDate = '必选';
    if (!form.departureTimeStart) e.departureTimeStart = '必选';
    if (!form.departureTimeEnd) e.departureTimeEnd = '必选';
    if (form.departureTimeStart && form.departureTimeEnd && form.departureTimeStart >= form.departureTimeEnd)
      e.departureTimeEnd = '最晚需晚于最早';
    if (form.departureDate && form.departureTimeEnd) {
      const endTime = new Date(`${form.departureDate}T${form.departureTimeEnd}:00`).getTime();
      if (endTime <= Date.now()) e.departureTimeEnd = '最晚出发时间需晚于当前时间';
    }
    if (!form.departureName.trim()) e.departureName = '必填';
    if (!form.arrivalName.trim()) e.arrivalName = '必填';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;

    // Warn if departure end is within 20 min
    const departureEnd = new Date(`${form.departureDate}T${form.departureTimeEnd}:00`).getTime();
    const minutesLeft = Math.round((departureEnd - Date.now()) / 60000);
    if (minutesLeft <= 20 && minutesLeft > 0) {
      const r = await Taro.showModal({
        title: '临近出发时间',
        content: `最晚出发时间还剩 ${minutesLeft} 分钟，确定发布吗？`,
        confirmText: '确定发布',
      });
      if (!r.confirm) return;
    }

    setSubmitting(true);
    try {
      await createTrip({
        departureDate: form.departureDate,
        departureTimeStart: form.departureTimeStart,
        departureTimeEnd: form.departureTimeEnd,
        departureLocation: {
          name: form.departureName.trim(),
          address: form.departureAddress || form.departureName.trim(),
          latitude: form.departureLat, longitude: form.departureLng,
        },
        arrivalLocation: {
          name: form.arrivalName.trim(),
          address: form.arrivalAddress || form.arrivalName.trim(),
          latitude: form.arrivalLat, longitude: form.arrivalLng,
        },
        ticketTime: (form.ticketDate && form.ticketTime) ? `${form.ticketDate} ${form.ticketTime}` : undefined,
        maxPassengers: form.maxPassengers,
        luggageSize: form.luggageSize,
        note: form.note || undefined,
      });
      Taro.showToast({ title: '发布成功', icon: 'success', duration: 1500 });
      Taro.switchTab({ url: '/pages/plaza/index' });
    } catch (err: any) {
      Taro.showToast({ title: err.message || '发布失败', icon: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="pg-create" scrollY>
      {/* ---- HERO: Route Visual ---- */}
      <View className="hero">
        <View className="hero__progress">
          <View className="hero__progress-track">
            <View className="hero__progress-fill" style={{ width: `${progress}%` }} />
          </View>
          <Text className="hero__progress-pct">{progress}%</Text>
        </View>

        <View className="hero__route">
          {/* Departure */}
          <View className="hero__node">
            <View className="hero__dot hero__dot--from">
              <View className="hero__dot-core" />
            </View>
            <View className="hero__node-body">
              <Text className="hero__node-flag">出发</Text>
              <Picker
                mode="selector"
                range={LOCATION_OPTIONS.map((o) => `${o.name}${o.children?.length ? ' ›' : ''}${o.customChild ? ' ✎' : ''}`)}
                onChange={makeLocHandler('departure')}
              >
                <View className="hero__node-picker">
                  <Text className={form.departureName ? 'hero__node-val' : 'hero__node-holder'}>
                    {form.departureName || '点击选择出发地点'}
                  </Text>
                  <Text className="hero__node-arrow">›</Text>
                </View>
              </Picker>
              {errors.departureName && <Text className="hero__err">{errors.departureName}</Text>}
            </View>
          </View>

          {/* Connector */}
          <View className="hero__connector">
            <View className="hero__connector-line" />
            <View className="hero__connector-badge">
              <Text className="hero__connector-icon">🚗</Text>
            </View>
          </View>

          {/* Arrival */}
          <View className="hero__node">
            <View className="hero__dot hero__dot--to">
              <View className="hero__dot-core" />
            </View>
            <View className="hero__node-body">
              <Text className="hero__node-flag">到达</Text>
              <Picker
                mode="selector"
                range={LOCATION_OPTIONS.map((o) => `${o.name}${o.children?.length ? ' ›' : ''}${o.customChild ? ' ✎' : ''}`)}
                onChange={makeLocHandler('arrival')}
              >
                <View className="hero__node-picker">
                  <Text className={form.arrivalName ? 'hero__node-val' : 'hero__node-holder'}>
                    {form.arrivalName || '点击选择到达地点'}
                  </Text>
                  <Text className="hero__node-arrow">›</Text>
                </View>
              </Picker>
              {errors.arrivalName && <Text className="hero__err">{errors.arrivalName}</Text>}
            </View>
          </View>
        </View>
      </View>

      {/* ---- SHEET: Time Details ---- */}
      <View className="sheet">
        <View className="sheet__row">
          <Text className="sheet__row-icon">📅</Text>
          <View className="sheet__field">
            <Text className="sheet__label">出发日期</Text>
            <Picker mode="date" start={today} value={form.departureDate} onChange={(e: any) => set('departureDate', e.detail.value)}>
              <View className={`sheet__val ${errors.departureDate ? 'sheet__val--err' : ''} ${form.departureDate ? '' : 'sheet__val--empty'}`}>
                <Text>{form.departureDate || '选择日期'}</Text>
              </View>
            </Picker>
          </View>
        </View>

        <View className="sheet__div" />

        <View className="sheet__row">
          <Text className="sheet__row-icon">🕐</Text>
          <View className="sheet__field sheet__field--half">
            <Text className="sheet__label">最早出发</Text>
            <Picker mode="time" value={form.departureTimeStart} onChange={(e: any) => set('departureTimeStart', e.detail.value)}>
              <View className={`sheet__val ${errors.departureTimeStart ? 'sheet__val--err' : ''} ${form.departureTimeStart ? '' : 'sheet__val--empty'}`}>
                <Text>{form.departureTimeStart || '-- : --'}</Text>
              </View>
            </Picker>
          </View>
          <View className="sheet__sep">
            <Text>—</Text>
          </View>
          <View className="sheet__field sheet__field--half">
            <Text className="sheet__label">最晚出发</Text>
            <Picker mode="time" value={form.departureTimeEnd} onChange={(e: any) => set('departureTimeEnd', e.detail.value)}>
              <View className={`sheet__val ${errors.departureTimeEnd ? 'sheet__val--err' : ''} ${form.departureTimeEnd ? '' : 'sheet__val--empty'}`}>
                <Text>{form.departureTimeEnd || '-- : --'}</Text>
              </View>
            </Picker>
          </View>
        </View>
        {errors.departureTimeEnd && <Text className="sheet__err">{errors.departureTimeEnd}</Text>}

        <View className="sheet__div" />

        <View className="sheet__row">
          <Text className="sheet__row-icon">🎫</Text>
          <View className="sheet__field sheet__field--half">
            <Text className="sheet__label">票面日期（选填）</Text>
            <Picker mode="date" start={today} value={form.ticketDate} onChange={(e: any) => set('ticketDate', e.detail.value)}>
              <View className={`sheet__val ${errors.ticketDate ? 'sheet__val--err' : ''} ${form.ticketDate ? '' : 'sheet__val--empty'}`}>
                <Text>{form.ticketDate || '选择日期'}</Text>
              </View>
            </Picker>
          </View>
          <View className="sheet__field sheet__field--half">
            <Text className="sheet__label">票面时间（选填）</Text>
            <Picker mode="time" value={form.ticketTime} onChange={(e: any) => set('ticketTime', e.detail.value)}>
              <View className={`sheet__val ${errors.ticketTime ? 'sheet__val--err' : ''} ${form.ticketTime ? '' : 'sheet__val--empty'}`}>
                <Text>{form.ticketTime || '-- : --'}</Text>
              </View>
            </Picker>
          </View>
        </View>
      </View>

      {/* ---- SHEET: Settings ---- */}
      <View className="sheet">
        <View className="sheet__row">
          <Text className="sheet__row-icon">👥</Text>
          <View className="sheet__field">
            <Text className="sheet__label">期望人数（含自己）</Text>
            <Picker
              mode="selector"
              range={MAX_PASSENGERS_OPTIONS.map(String)}
              value={MAX_PASSENGERS_OPTIONS.indexOf(form.maxPassengers)}
              onChange={(e: any) => set('maxPassengers', MAX_PASSENGERS_OPTIONS[Number(e.detail.value)])}
            >
              <View className="sheet__val">
                <Text>{form.maxPassengers} 人</Text>
                <Text className="sheet__chevron">›</Text>
              </View>
            </Picker>
          </View>
        </View>

        <View className="sheet__div" />

        <View className="sheet__row">
          <Text className="sheet__row-icon">🧳</Text>
          <View className="sheet__field">
            <Text className="sheet__label">本次行李大小</Text>
            <Picker
              mode="selector"
              range={LUGGAGE_OPTIONS.map((l) => l.label)}
              value={LUGGAGE_OPTIONS.findIndex((l) => l.value === form.luggageSize)}
              onChange={(e: any) => {
                const v = (['none', 'small', 'medium', 'large', 'xlarge'] as const)[e.detail.value];
                set('luggageSize', v);
              }}
            >
              <View className="sheet__val">
                <Text>{LUGGAGE_OPTIONS.find((l) => l.value === form.luggageSize)?.label}</Text>
                <Text className="sheet__chevron">›</Text>
              </View>
            </Picker>
          </View>
        </View>

        <View className="sheet__div" />

        <View className="sheet__row sheet__row--top">
          <Text className="sheet__row-icon">💬</Text>
          <View className="sheet__field">
            <Text className="sheet__label">备注</Text>
            <Textarea
              className="sheet__textarea"
              placeholder="大件行李、顺路接送等..."
              placeholderStyle="color:rgba(0,0,0,0.15)"
              value={form.note}
              onInput={(e: any) => set('note', e.detail.value)}
              maxlength={200}
            />
            <Text className="sheet__count">{form.note.length}/200</Text>
          </View>
        </View>
      </View>

      {/* ---- SUBMIT ---- */}
      <View className="submit-area">
        <View className="submit-btn" onClick={submit}>
          <Text className="submit-btn__text">
            {submitting ? '发布中…' : '发布行程'}
          </Text>
        </View>
        <Text className="submit-hint">发布后同学们即可看到你的行程</Text>
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}
