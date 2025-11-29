'use client';

import { useState, useCallback } from 'react';
import type { LoginPayload, User, UseEnfyraAuthReturn } from '../types';
import { useEnfyraApi } from './useEnfyraApi';
import { useAuthStore } from './store/authStore';

interface AuthState {
  me: User | null;
  setMe: (user: User | null) => void;
  clearAuth: () => void;
}

export function useEnfyraAuth(): UseEnfyraAuthReturn {
  const me = useAuthStore((state: AuthState) => state.me);
  const setMe = useAuthStore((state: AuthState) => state.setMe);
  const clearAuth = useAuthStore((state: AuthState) => state.clearAuth);
  const [isLoading, setIsLoading] = useState(false);

  const {
    execute: executeLogin,
  } = useEnfyraApi('/login', {
    method: 'post',
    errorContext: 'Login',
  });

  const { execute: executeLogout } = useEnfyraApi('/logout', {
    method: 'post',
    errorContext: 'Logout',
  });

  const {
    execute: executeFetchUser,
  } = useEnfyraApi('/me', {
    errorContext: 'Fetch User Profile',
  });

  const fetchUser = useCallback(
    async (options?: { fields?: string[] }) => {
      setIsLoading(true);

      try {
        const queryParams: any = {};

        if (options?.fields && options.fields.length > 0) {
          // Backend expects comma-separated fields, e.g. "role.*"
          queryParams.fields = options.fields.join(',');
        }

        const result = await executeFetchUser({
          query: queryParams,
        });

        if (!result) {
          clearAuth();
          return;
        }

        // Support both `{ data: User[] }` and direct `User` responses
        const anyResult = result as any;
        const user =
          Array.isArray(anyResult?.data) && anyResult.data.length > 0
            ? (anyResult.data[0] as User)
            : (anyResult as User);

        setMe(user || null);
      } finally {
        setIsLoading(false);
      }
    },
    [executeFetchUser, setMe, clearAuth]
  );

  const login = useCallback(
    async (payload: LoginPayload) => {
      setIsLoading(true);

      try {
        const loginResult = await executeLogin({ body: payload });

        if (!loginResult) {
          return null;
        }

        await fetchUser();

        return loginResult;
      } finally {
        setIsLoading(false);
      }
    },
    [executeLogin, fetchUser]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await executeLogout();
      clearAuth();

      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      clearAuth();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } finally {
      setIsLoading(false);
    }
  }, [executeLogout, clearAuth]);

  const isLoggedIn = !!me;

  return {
    me,
    login,
    logout,
    fetchUser,
    isLoggedIn,
    isLoading,
  };
}

