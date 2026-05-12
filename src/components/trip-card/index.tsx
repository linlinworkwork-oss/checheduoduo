import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Trip } from '../../stores/tripStore';
import Avatar from '../ui/avatar';
import './index.scss';

interface Props {
  trip: Trip;
}

export default function TripCard({ trip }: Props) {
  const {
    _id, departureDate, departureTimeStart, departureTimeEnd,
    departureLocation, arrivalLocation, ticketTime,
    currentPassengers, maxPassengers, status, creator, passengers = [],
  } = trip;

  // Guard against malformed trip data
  if (!departureLocation || !arrivalLocation || !creator) return null;

  const spotsLeft = maxPassengers - currentPassengers;

  return (
    <View
      className="tcard"
      onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${_id}` })}
    >
      {/* Destination — the most important info, big and bold */}
      <Text className="tcard__dest">{arrivalLocation.name}</Text>

      {/* Route: from → to */}
      <View className="tcard__route">
        <Text className="tcard__from">{departureLocation.name}</Text>
        <Text className="tcard__arrow">→</Text>
        <Text className="tcard__to">{arrivalLocation.name}</Text>
      </View>

      {/* Key info row */}
      <View className="tcard__info">
        {/* Departure deadline — highlighted */}
        <View className="tcard__deadline">
          <Text className="tcard__deadline-label">最晚出发</Text>
          <Text className="tcard__deadline-time">
            {departureDate} {departureTimeEnd}
          </Text>
        </View>

        {/* Ticket time — optional */}
        {ticketTime ? (
          <View className="tcard__ticket">
            <Text className="tcard__ticket-label">票面时间</Text>
            <Text className="tcard__ticket-time">{ticketTime}</Text>
          </View>
        ) : null}
      </View>

      {/* Bottom: creator + spots */}
      <View className="tcard__footer">
        <View className="tcard__creator">
          <Avatar src={creator.avatarUrl} size={28} name={creator.nickName} />
          <Text className="tcard__name">{creator.nickName || '同学'}</Text>
          <View className={`tcard__gender ${creator.gender === 'female' ? 'tcard__gender--f' : ''}`}>
            <Text>{creator.gender === 'female' ? '♀' : '♂'}</Text>
          </View>
        </View>

        <View className="tcard__right">
          {/* Passenger avatars */}
          <View className="tcard__faces">
            {passengers.slice(0, 3).map((p, i) => (
              <View key={p.userId} style={{ zIndex: 3 - i, marginLeft: i > 0 ? '-8px' : '0' }}>
                <Avatar src={p.avatarUrl} size={24} name={p.nickName} />
              </View>
            ))}
            {passengers.length > 3 && (
              <View className="tcard__face-more">+{passengers.length - 3}</View>
            )}
          </View>

          {/* Spots left — urgency indicator */}
          {status === 'open' ? (
            spotsLeft <= 2 ? (
              <View className="tcard__spots tcard__spots--urgent">
                <Text>仅剩 {spotsLeft} 位</Text>
              </View>
            ) : (
              <View className="tcard__spots">
                <Text>{currentPassengers}/{maxPassengers} 人</Text>
              </View>
            )
          ) : (
            <View className="tcard__spots tcard__spots--full">
              <Text>已满</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
