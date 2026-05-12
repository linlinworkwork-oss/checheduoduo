import { create } from 'zustand';

import { callCloudFunction } from '../lib/cloud';

export interface UserProfile {
  _id?: string;
  openid: string;
  avatarUrl: string;
  nickName: string;
  phone: string;
  gender: 'male' | 'female';
  createdAt?: number;
}

interface UserState {
  user: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  isLogin: boolean;
  initUser: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  isLogin: false,

  initUser: async () => {
    set({ loading: true });
    try {
      const res = await callCloudFunction<{ code: number; user?: UserProfile; message?: string }>(
        'login',
        {},
      );
      if (res?.user) {
        set({ user: res.user, isLogin: true });
      } else {
        console.warn('[User] login returned no user:', res?.message);
      }
    } catch (err) {
      console.error('[User] Login failed:', err);
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  updateProfile: async (data) => {
    const current = get().user;
    if (!current) return;
    const res = await callCloudFunction<{ code: number; user: UserProfile }>('updateProfile', {
      ...data,
    });
    if (res?.user) {
      set({ user: { ...current, ...res.user } });
    }
  },
}));
