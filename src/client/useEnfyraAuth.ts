'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LoginPayload, User, UseEnfyraAuthReturn } from '../types';
import { useEnfyraApi } from './useEnfyraApi';

let globalMe: User | null = null;
let globalListeners: Set<() => void> = new Set();

function notifyListeners() {
  globalListeners.forEach((listener) => listener());
}

export function useEnfyraAuth(): UseEnfyraAuthReturn {
  const [me, setMe] = useState<User | null>(globalMe);
  const [isLoading, setIsLoading] = useState(false);

  // Sync with global state
  useEffect(() => {
    const listener = () => setMe(globalMe);
    globalListeners.add(listener);
    return () => {
      globalListeners.delete(listener);
    };
  }, []);

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
          globalMe = null;
          setMe(null);
          notifyListeners();
          return;
        }

        // Support both `{ data: User[] }` and direct `User` responses
        const anyResult = result as any;
        const user =
          Array.isArray(anyResult?.data) && anyResult.data.length > 0
            ? (anyResult.data[0] as User)
            : (anyResult as User);

        globalMe = user || null;
        setMe(globalMe);
        notifyListeners();
      } finally {
        setIsLoading(false);
      }
    },
    [executeFetchUser]
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
      globalMe = null;
      setMe(null);
      notifyListeners();

      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      globalMe = null;
      setMe(null);
      notifyListeners();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } finally {
      setIsLoading(false);
    }
  }, [executeLogout]);

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

