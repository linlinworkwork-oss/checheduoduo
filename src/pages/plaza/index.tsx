import { useState, useMemo } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, useReachBottom, usePullDownRefresh } from '@tarojs/taro';
import { useTripStore } from '../../stores/tripStore';
import { LOCATION_OPTIONS } from '../../lib/constants';
import TripCard from '../../components/trip-card';
import PhonePopup from '../../components/ui/phone-popup';
import './index.scss';

type FilterTab = 'departure' | 'arrival' | 'status' | null;

export default function Plaza() {
  const { trips, loading, hasMore, error, listTrips, loadMore, refreshTrips } = useTripStore();
  const [selectedDate, setSelectedDate] = useState('');
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'today'>('all');

  // Filter state
  const [filterOpen, setFilterOpen] = useState<FilterTab>(null);
  const [departureFilters, setDepartureFilters] = useState<string[]>([]);
  const [arrivalFilters, setArrivalFilters] = useState<string[]>([]);
  const [hideFull, setHideFull] = useState(true);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const filter = useMemo(() => {
    const f: any = { keyword, hideFull };
    if (activeTab === 'today') f.departureDate = todayStr;
    else if (selectedDate) f.departureDate = selectedDate;
    if (departureFilters.length > 0) f.departureNames = departureFilters;
    if (arrivalFilters.length > 0) f.arrivalNames = arrivalFilters;
    return f;
  }, [activeTab, selectedDate, keyword, todayStr, departureFilters, arrivalFilters, hideFull]);

  const activeFilterCount =
    departureFilters.length + arrivalFilters.length + (hideFull ? 0 : 1);

  useDidShow(() => {
    listTrips(filter);
  });

  useReachBottom(() => {
    loadMore(filter);
  });

  usePullDownRefresh(() => {
    refreshTrips(filter).finally(() => Taro.stopPullDownRefresh());
  });

  const dateChips = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = i === 0 ? '今天' : i === 1 ? '明天' : i === 2 ? '后天' : `${d.getMonth() + 1}/${d.getDate()}`;
      return { date: ds, label };
    });
  }, []);

  const handleSearch = () => refreshTrips(filter);

  const toggleFilter = (tab: FilterTab) => {
    setFilterOpen((prev) => (prev === tab ? null : tab));
  };

  const toggleDeparture = (name: string) => {
    setDepartureFilters((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const toggleArrival = (name: string) => {
    setArrivalFilters((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const resetFilters = () => {
    setDepartureFilters([]);
    setArrivalFilters([]);
    setHideFull(true);
  };

  const applyFilters = () => {
    setFilterOpen(null);
    refreshTrips(filter);
  };

  const locationNames = LOCATION_OPTIONS.map((o) => o.name);

  return (
    <View className="pg-plaza">
      {/* Greeting */}
      <View className="plaza-head">
        <Text className="plaza-head__title">行程广场</Text>
        <Text className="plaza-head__sub">找到同路的同学，一起出发</Text>
      </View>

      {/* Search */}
      <View className="plaza-search">
        <Text className="plaza-search__icon">🔍</Text>
        <Input
          className="plaza-search__input"
          placeholder="搜索出发地或目的地"
          placeholderStyle="color:#aeaeb2"
          value={keyword}
          onInput={(e: any) => setKeyword(e.detail.value)}
          onConfirm={handleSearch}
        />
      </View>

      {/* Date chips */}
      <ScrollView className="plaza-chips" scrollX showScrollbar={false}>
        <View
          className={`plaza-chips__item ${activeTab === 'all' && !selectedDate ? 'plaza-chips__item--on' : ''}`}
          onClick={() => { setActiveTab('all'); setSelectedDate(''); refreshTrips({ keyword, hideFull, departureNames: departureFilters, arrivalNames: arrivalFilters }); }}
        >
          <Text>全部</Text>
        </View>
        <View
          className={`plaza-chips__item ${activeTab === 'today' ? 'plaza-chips__item--on' : ''}`}
          onClick={() => { setActiveTab('today'); setSelectedDate(''); refreshTrips({ departureDate: todayStr, keyword, hideFull, departureNames: departureFilters, arrivalNames: arrivalFilters }); }}
        >
          <Text>今天出发</Text>
        </View>
        {dateChips.slice(1).map(({ date, label }) => (
          <View
            key={date}
            className={`plaza-chips__item ${activeTab === 'all' && selectedDate === date ? 'plaza-chips__item--on' : ''}`}
            onClick={() => { setActiveTab('all'); setSelectedDate(date); refreshTrips({ departureDate: date, keyword, hideFull, departureNames: departureFilters, arrivalNames: arrivalFilters }); }}
          >
            <Text>{label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Filter bar — 12306 style */}
      <View className="filter-bar">
        <View
          className={`filter-bar__item ${filterOpen === 'departure' ? 'filter-bar__item--on' : ''} ${departureFilters.length > 0 ? 'filter-bar__item--active' : ''}`}
          onClick={() => toggleFilter('departure')}
        >
          <Text>出发地</Text>
          <Text className={`filter-bar__arrow ${filterOpen === 'departure' ? 'filter-bar__arrow--up' : ''}`}>▾</Text>
        </View>
        <View
          className={`filter-bar__item ${filterOpen === 'arrival' ? 'filter-bar__item--on' : ''} ${arrivalFilters.length > 0 ? 'filter-bar__item--active' : ''}`}
          onClick={() => toggleFilter('arrival')}
        >
          <Text>目的地</Text>
          <Text className={`filter-bar__arrow ${filterOpen === 'arrival' ? 'filter-bar__arrow--up' : ''}`}>▾</Text>
        </View>
        <View
          className={`filter-bar__item ${filterOpen === 'status' ? 'filter-bar__item--on' : ''} ${!hideFull ? 'filter-bar__item--active' : ''}`}
          onClick={() => toggleFilter('status')}
        >
          <Text>筛选</Text>
          {activeFilterCount > 0 && (
            <View className="filter-bar__badge"><Text>{activeFilterCount}</Text></View>
          )}
          <Text className={`filter-bar__arrow ${filterOpen === 'status' ? 'filter-bar__arrow--up' : ''}`}>▾</Text>
        </View>
      </View>

      {/* Filter panel — expandable */}
      {filterOpen && (
        <View className="filter-panel">
          {/* Departure filter */}
          {filterOpen === 'departure' && (
            <View className="filter-panel__grid">
              {locationNames.map((name) => (
                <View
                  key={name}
                  className={`filter-panel__chip ${departureFilters.includes(name) ? 'filter-panel__chip--on' : ''}`}
                  onClick={() => toggleDeparture(name)}
                >
                  <Text>{name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Arrival filter */}
          {filterOpen === 'arrival' && (
            <View className="filter-panel__grid">
              {locationNames.map((name) => (
                <View
                  key={name}
                  className={`filter-panel__chip ${arrivalFilters.includes(name) ? 'filter-panel__chip--on' : ''}`}
                  onClick={() => toggleArrival(name)}
                >
                  <Text>{name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Status filter */}
          {filterOpen === 'status' && (
            <View className="filter-panel__status">
              <View
                className={`filter-panel__switch ${hideFull ? '' : 'filter-panel__switch--on'}`}
                onClick={() => setHideFull(!hideFull)}
              >
                <Text>显示已满员行程</Text>
                <View className={`filter-panel__toggle ${hideFull ? '' : 'filter-panel__toggle--on'}`}>
                  <View className={`filter-panel__toggle-knob ${hideFull ? '' : 'filter-panel__toggle-knob--on'}`} />
                </View>
              </View>
            </View>
          )}

          {/* Panel footer */}
          <View className="filter-panel__footer">
            <View className="filter-panel__reset" onClick={resetFilters}>
              <Text>重置</Text>
            </View>
            <View className="filter-panel__confirm" onClick={applyFilters}>
              <Text>确定</Text>
            </View>
          </View>
        </View>
      )}

      {/* Overlay to close panel */}
      {filterOpen && <View className="filter-overlay" onClick={() => setFilterOpen(null)} />}

      {/* List */}
      {loading && trips.length === 0 ? (
        <View className="plaza-state">
          <Text className="plaza-state__icon">⏳</Text>
          <Text className="plaza-state__text">加载中...</Text>
        </View>
      ) : error && trips.length === 0 ? (
        <View className="plaza-state">
          <Text className="plaza-state__icon">⚠️</Text>
          <Text className="plaza-state__text">加载失败</Text>
          <Text className="plaza-state__hint">{error}</Text>
        </View>
      ) : trips.length === 0 ? (
        <View className="plaza-state">
          <Text className="plaza-state__icon">🛣️</Text>
          <Text className="plaza-state__text">暂无行程</Text>
          <Text className="plaza-state__hint">试试调整筛选条件</Text>
        </View>
      ) : (
        <View className="plaza-list">
          {trips.filter((t) => t.status !== 'cancelled').map((trip) => (
            <TripCard key={trip._id} trip={trip} />
          ))}
          {loading && <View className="plaza-loading"><Text>加载更多...</Text></View>}
          {!hasMore && trips.length > 0 && (
            <View className="plaza-end"><Text>— 已经到底了 —</Text></View>
          )}
        </View>
      )}

      <PhonePopup />
    </View>
  );
}
