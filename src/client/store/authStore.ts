'use client';

import { create } from 'zustand';
import type { User } from '../../types';

interface AuthState {
  me: User | null;
  setMe: (user: User | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  me: null,
  setMe: (user: User | null) => set({ me: user }),
  clearAuth: () => set({ me: null }),
}));

