import { EnfyraClient } from '@enfyra/sdk-core'
import { createStore } from 'zustand/vanilla'
import type { StoreApi } from 'zustand/vanilla'
import type { UserInfo, RequestStatus } from '@enfyra/sdk-core'

export interface AuthState {
  user: UserInfo | null
  isAuthenticated: boolean
  pending: boolean
  status: RequestStatus | null
  error: Error | null
}

export interface AuthActions {
  refresh: () => Promise<UserInfo | null>
  setUser: (user: UserInfo | null) => void
  setPending: (pending: boolean, status?: RequestStatus | null) => void
  setError: (error: Error | null) => void
}

export type AuthStore = AuthState & AuthActions

let clientInstance: EnfyraClient | null = null
let authStoreInstance: StoreApi<AuthStore> | null = null
let refreshPromise: Promise<UserInfo | null> | null = null

function getRoutePrefix(): string {
  if (typeof process !== 'undefined' && process.env?.ENFYRA_ROUTE_PREFIX) {
    return process.env.ENFYRA_ROUTE_PREFIX
  }
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).ENFYRA_ROUTE_PREFIX) {
    return (window as unknown as Record<string, unknown>).ENFYRA_ROUTE_PREFIX as string
  }
  return '/api/enfyra'
}

export function getBrowserClient(): EnfyraClient {
  if (!clientInstance) {
    const baseUrl = getRoutePrefix()
    clientInstance = new EnfyraClient({
      baseUrl,
      auth: { strategy: 'cookie' },
    })
  }
  return clientInstance
}

export function getAuthStore(): StoreApi<AuthStore> {
  if (!authStoreInstance) {
    const client = getBrowserClient()
    authStoreInstance = createStore<AuthStore>((set, get) => ({
      user: null,
      isAuthenticated: false,
      pending: false,
      status: null,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: user !== null }),
      setPending: (pending, status) => set({ pending, ...(status !== undefined ? { status } : {}) }),
      setError: (error) => set({ error }),

      refresh: async () => {
        if (refreshPromise) return refreshPromise

        set({ pending: true, status: 'pending', error: null })
        refreshPromise = (async () => {
          try {
            const user = await client.auth.getMe()
            set({ user, isAuthenticated: user !== null, pending: false, status: 'success' })
            return user
          } catch (err) {
            const is401 = err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode?: number }).statusCode === 401
            if (is401) {
              set({ user: null, isAuthenticated: false, pending: false, status: 'success' })
              return null
            }
            const error = err instanceof Error ? err : new Error('Auth check failed')
            set({ error, pending: false, status: 'error' })
            return null
          } finally {
            refreshPromise = null
          }
        })()
        return refreshPromise
      },
    }))
  }
  return authStoreInstance
}

export function resetBrowserRuntime(): void {
  clientInstance = null
  authStoreInstance = null
  refreshPromise = null
}
