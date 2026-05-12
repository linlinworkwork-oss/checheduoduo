import { create } from 'zustand';
import { callCloudFunction } from '../lib/cloud';

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

  listTrips: async (filter = {}) => {
    set({ loading: true });
    try {
      const res = await callCloudFunction<{ trips: Trip[]; hasMore: boolean }>('listTrips', {
        ...filter,
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
      });
      set({ trips: res.trips || [], hasMore: res.hasMore ?? false, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadMore: async (filter = {}) => {
    const { trips, hasMore, loading } = get();
    if (!hasMore || loading) return;
    set({ loading: true });
    try {
      const res = await callCloudFunction<{ trips: Trip[]; hasMore: boolean }>('listTrips', {
        ...filter,
        page: Math.ceil(trips.length / 20) + 1,
        pageSize: 20,
      });
      set({ trips: [...trips, ...res.trips], hasMore: res.hasMore, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createTrip: async (input) => {
    const trip = await callCloudFunction<Trip>('createTrip', input as any);
    return trip;
  },

  joinTrip: async (tripId, luggageSize) => {
    const updated = await callCloudFunction<Trip>('joinTrip', { tripId, luggageSize });
    set((state) => ({
      trips: state.trips.map((t) => (t._id === tripId ? { ...t, ...updated } : t)),
      myJoinedTrips: [...state.myJoinedTrips, updated],
    }));
  },

  leaveTrip: async (tripId) => {
    const updated = await callCloudFunction<Trip>('leaveTrip', { tripId });
    set((state) => ({
      trips: state.trips.map((t) => (t._id === tripId ? { ...t, ...updated } : t)),
      myJoinedTrips: state.myJoinedTrips.filter((t) => t._id !== tripId),
    }));
  },

  cancelTrip: async (tripId) => {
    await callCloudFunction('cancelTrip', { tripId });
    set((state) => ({
      trips: state.trips.filter((t) => t._id !== tripId),
      myCreatedTrips: state.myCreatedTrips.filter((t) => t._id !== tripId),
      myJoinedTrips: state.myJoinedTrips.filter((t) => t._id !== tripId),
    }));
  },

  completeTrip: async (tripId) => {
    await callCloudFunction('completeTrip', { tripId });
    set((state) => {
      const findTrip = (list: Trip[]) => list.find((t) => t._id === tripId);
      const completed = findTrip(state.myCreatedTrips) || findTrip(state.myJoinedTrips) || findTrip(state.trips);
      const completedTrip = completed
        ? { ...completed, completedBy: [...(completed.completedBy || []), 'local'] }
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
      set({
        myCreatedTrips: res.created || [],
        myJoinedTrips: res.joined || [],
        myCompletedTrips: res.completed || [],
      });
    } catch (err) {
      console.error('[Trip] getMyTrips failed:', err);
    }
  },
}));
