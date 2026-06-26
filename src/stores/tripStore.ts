import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { callCloudFunction } from '../lib/cloud';
import { useUserStore } from './userStore';

const DEFAULT_PAGE_SIZE = 20;

export interface TripLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface Passenger {
  userId: string;
  nickName: string;
  avatarUrl: string;
  phone: string;
  gender: 'male' | 'female';
  luggageSize: 'none' | 'small' | 'medium' | 'large' | 'xlarge';
  joinedAt: number;
}

export interface Trip {
  _id: string;
  creatorId: string;
  creator: {
    nickName: string;
    avatarUrl: string;
    phone: string;
    gender: 'male' | 'female';
  };
  departureDate: string;
  departureTimeStart: string;
  departureTimeEnd: string;
  departureLocation: TripLocation;
  arrivalLocation: TripLocation;
  ticketTime: string;
  maxPassengers: number;
  currentPassengers: number;
  status: 'open' | 'full' | 'cancelled';
  passengers: Passenger[];
  completedBy?: string[];
  createdAt: number;
}

export interface CreateTripInput {
  departureDate: string;
  departureTimeStart: string;
  departureTimeEnd: string;
  departureLocation: TripLocation;
  arrivalLocation: TripLocation;
  ticketTime: string;
  maxPassengers: number;
  luggageSize: 'none' | 'small' | 'medium' | 'large' | 'xlarge';
  note?: string;
}

export interface ListTripsFilter {
  departureDate?: string;
  keyword?: string;
  departureNames?: string[];
  arrivalNames?: string[];
  hideFull?: boolean;
  page?: number;
  pageSize?: number;
}

interface TripState {
  trips: Trip[];
  myCreatedTrips: Trip[];
  myJoinedTrips: Trip[];
  myCompletedTrips: Trip[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;

  listTrips: (filter?: ListTripsFilter) => Promise<void>;
  loadMore: (filter?: ListTripsFilter) => Promise<void>;
  createTrip: (input: CreateTripInput) => Promise<Trip>;
  joinTrip: (tripId: string, luggageSize?: string) => Promise<void>;
  leaveTrip: (tripId: string) => Promise<void>;
  cancelTrip: (tripId: string) => Promise<void>;
  completeTrip: (tripId: string) => Promise<void>;
  refreshTrips: (filter?: ListTripsFilter) => Promise<void>;
  getMyTrips: () => Promise<void>;
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  myCreatedTrips: [],
  myJoinedTrips: [],
  myCompletedTrips: [],
  loading: false,
  hasMore: true,
  error: null,

  listTrips: async (filter = {}) => {
    set({ loading: true, error: null });
    try {
      const res = await callCloudFunction<{ trips: Trip[]; hasMore: boolean }>('listTrips', {
        ...filter,
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
      });
      set({ trips: res.trips || [], hasMore: res.hasMore ?? false, loading: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '加载失败';
      set({ loading: false, error: msg });
      Taro.showToast({ title: msg, icon: 'none' });
    }
  },

  loadMore: async (filter = {}) => {
    const { trips, hasMore, loading } = get();
    if (!hasMore || loading) return;
    set({ loading: true, error: null });
    try {
      const res = await callCloudFunction<{ trips: Trip[]; hasMore: boolean }>('listTrips', {
        ...filter,
        page: Math.ceil(trips.length / DEFAULT_PAGE_SIZE) + 1,
        pageSize: DEFAULT_PAGE_SIZE,
      });
      set({ trips: [...trips, ...res.trips], hasMore: res.hasMore, loading: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '加载失败';
      set({ loading: false, error: msg });
      Taro.showToast({ title: msg, icon: 'none' });
    }
  },

  createTrip: async (input) => {
    const res = await callCloudFunction<{ trip: Trip }>('createTrip', input as Record<string, unknown>);
    return res.trip;
  },

  joinTrip: async (tripId, luggageSize) => {
    const res = await callCloudFunction<{ trip: Trip }>('joinTrip', { tripId, luggageSize });
    const updated = res.trip;
    set((state) => ({
      trips: state.trips.map((t) => (t._id === tripId ? { ...t, ...updated } : t)),
      myJoinedTrips: state.myJoinedTrips.some((t) => t._id === tripId)
        ? state.myJoinedTrips.map((t) => (t._id === tripId ? { ...t, ...updated } : t))
        : [...state.myJoinedTrips, updated],
    }));
  },

  leaveTrip: async (tripId) => {
    const res = await callCloudFunction<{ trip: Trip }>('leaveTrip', { tripId });
    const updated = res.trip;
    set((state) => ({
      trips: state.trips.map((t) => (t._id === tripId ? { ...t, ...updated } : t)),
      myJoinedTrips: state.myJoinedTrips.filter((t) => t._id !== tripId),
      myCompletedTrips: state.myCompletedTrips.filter((t) => t._id !== tripId),
    }));
  },

  cancelTrip: async (tripId) => {
    await callCloudFunction('cancelTrip', { tripId });
    set((state) => ({
      trips: state.trips.filter((t) => t._id !== tripId),
      myCreatedTrips: state.myCreatedTrips.filter((t) => t._id !== tripId),
      myJoinedTrips: state.myJoinedTrips.filter((t) => t._id !== tripId),
      myCompletedTrips: state.myCompletedTrips.filter((t) => t._id !== tripId),
    }));
  },

  completeTrip: async (tripId) => {
    await callCloudFunction('completeTrip', { tripId });
    set((state) => {
      // Already in completed — skip to avoid duplicate
      if (state.myCompletedTrips.some((t) => t._id === tripId)) {
        return {};
      }
      const findTrip = (list: Trip[]) => list.find((t) => t._id === tripId);
      const completed = findTrip(state.myCreatedTrips) || findTrip(state.myJoinedTrips) || findTrip(state.trips);
      const completedTrip = completed
        ? { ...completed, completedBy: [...(completed.completedBy || []), useUserStore.getState().user?.openid || ''] }
        : null;
      return {
        trips: state.trips.filter((t) => t._id !== tripId),
        myCreatedTrips: state.myCreatedTrips.filter((t) => t._id !== tripId),
        myJoinedTrips: state.myJoinedTrips.filter((t) => t._id !== tripId),
        myCompletedTrips: completedTrip
          ? [completedTrip, ...state.myCompletedTrips]
          : state.myCompletedTrips,
      };
    });
  },

  refreshTrips: async (filter = {}) => {
    set({ hasMore: true });
    await get().listTrips(filter);
  },

  getMyTrips: async () => {
    try {
      const res = await callCloudFunction<{
        created: Trip[];
        joined: Trip[];
        completed: Trip[];
      }>('getMyTrips');
      set((state) => {
        // Merge server results with locally-known joined trips so a
        // just-joined trip isn't lost when the server query runs.
        const incomingIds = new Set([
          ...(res.created || []).map((t) => t._id),
          ...(res.joined || []).map((t) => t._id),
          ...(res.completed || []).map((t) => t._id),
        ]);
        const localOnlyJoined = state.myJoinedTrips.filter(
          (t) => !incomingIds.has(t._id),
        );
        return {
          myCreatedTrips: res.created || [],
          myJoinedTrips: [...(res.joined || []), ...localOnlyJoined],
          myCompletedTrips: res.completed || [],
        };
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '获取我的行程失败';
      Taro.showToast({ title: msg, icon: 'none' });
    }
  },
}));
