import { ReactNode } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Trip } from '../../stores/tripStore';
import './index.scss';

interface Props {
  trip: Trip;
  /** Applies the "completed" (dimmed) style. */
  done?: boolean;
  /** Optional right-hand content of the meta row (e.g. status text). */
  children?: ReactNode;
}

export default function TripRow({ trip, done = false, children }: Props) {
  if (!trip.departureLocation || !trip.arrivalLocation) return null;

  return (
    <View
      className={`trip-row${done ? ' trip-row--done' : ''}`}
      onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${trip._id}` })}
    >
      <View className="trip-row__route">
        <Text className="trip-row__from">{trip.departureLocation.name}</Text>
        <Text className="trip-row__arrow">→</Text>
        <Text className="trip-row__to">{trip.arrivalLocation.name}</Text>
      </View>
      <View className="trip-row__meta">
        <Text className="trip-row__date">{trip.departureDate}</Text>
        {children}
      </View>
    </View>
  );
}
