'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { EnfyraClient, LoginCredentials, AuthLoginResult, UserInfo, RequestStatus } from '@enfyra/sdk-core'
import { getBrowserClient, getAuthStore } from './internal/browser-runtime'
import type { AuthStore } from './internal/browser-runtime'

export function useEnfyra(): EnfyraClient {
  return getBrowserClient()
}

export { getBrowserClient as enfyra }

function useAuthStoreSelector<T>(selector: (state: AuthStore) => T): T {
  const store = getAuthStore()
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  )
}

export interface UseAuthReturn {
  user: UserInfo | null
  isAuthenticated: boolean
  pending: boolean
  status: RequestStatus | null
  error: Error | null
  login: (credentials: LoginCredentials) => Promise<AuthLoginResult | null>
  logout: () => Promise<void>
  refresh: () => Promise<UserInfo | null>
}

export function useAuth(): UseAuthReturn {
  const client = useEnfyra()
  const store = getAuthStore()

  const user = useAuthStoreSelector((s) => s.user)
  const isAuthenticated = useAuthStoreSelector((s) => s.isAuthenticated)
  const pending = useAuthStoreSelector((s) => s.pending)
  const status = useAuthStoreSelector((s) => s.status)
  const error = useAuthStoreSelector((s) => s.error)
  const refresh = useAuthStoreSelector((s) => s.refresh)

  const hydrated = useRef(false)

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      void refresh()
    }
  }, [refresh])

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthLoginResult | null> => {
    store.getState().setPending(true, 'pending')
    store.getState().setError(null)
    try {
      const result = await client.auth.login(credentials)
      await store.getState().refresh()
      return result
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Login failed')
      store.getState().setError(e)
      store.getState().setPending(false, 'error')
      return null
    }
  }, [client, store])

  const logout = useCallback(async (): Promise<void> => {
    await client.auth.logout()
    store.getState().setUser(null)
    store.getState().setPending(false, null)
  }, [client, store])

  return { user, isAuthenticated, pending, status, error, login, logout, refresh }
}

export interface UseQueryReturn<T> {
  data: T | null
  pending: boolean
  error: Error | null
  execute: () => Promise<void>
}

export function useQuery<T>(fetcher: () => Promise<T>): UseQueryReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const execute = useCallback(async () => {
    setPending(true)
    setError(null)
    try {
      const result = await fetcherRef.current()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Query failed'))
    } finally {
      setPending(false)
    }
  }, [])

  useEffect(() => {
    void execute()
  }, [execute])

  return { data, pending, error, execute }
}

export interface UseMutationReturn<T, V> {
  data: T | null
  pending: boolean
  error: Error | null
  execute: (variables: V) => Promise<T | null>
}

export function useMutation<T, V = void>(
  mutator: (variables: V) => Promise<T>,
): UseMutationReturn<T, V> {
  const [data, setData] = useState<T | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async (variables: V): Promise<T | null> => {
    setPending(true)
    setError(null)
    try {
      const result = await mutator(variables)
      setData(result)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Mutation failed'))
      return null
    } finally {
      setPending(false)
    }
  }, [mutator])

  return { data, pending, error, execute }
}

export interface UseStorageReturn {
  upload: (params: { file: File; folder?: number | string; title?: string; description?: string }) => Promise<unknown>
  pending: boolean
  error: Error | null
}

export function useStorage(): UseStorageReturn {
  const client = useEnfyra()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const upload = useCallback(async (params: { file: File; folder?: number | string; title?: string; description?: string }) => {
    setPending(true)
    setError(null)
    try {
      return await client.storage.upload(params)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Upload failed'))
      return null
    } finally {
      setPending(false)
    }
  }, [client])

  return { upload, pending, error }
}
