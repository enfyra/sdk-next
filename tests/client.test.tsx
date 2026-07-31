import { describe, it, expect, beforeEach } from 'vitest'
import { resetBrowserRuntime, getBrowserClient, getAuthStore } from '../src/internal/browser-runtime'

describe('browser-runtime', () => {
  beforeEach(() => {
    resetBrowserRuntime()
  })

  it('creates singleton client', () => {
    const a = getBrowserClient()
    const b = getBrowserClient()
    expect(a).toBe(b)
  })

  it('creates singleton auth store', () => {
    const a = getAuthStore()
    const b = getAuthStore()
    expect(a).toBe(b)
  })

  it('auth store starts anonymous', () => {
    const store = getAuthStore()
    const state = store.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.pending).toBe(false)
    expect(state.status).toBeNull()
    expect(state.error).toBeNull()
  })

  it('reset creates new instances', () => {
    const clientA = getBrowserClient()
    const storeA = getAuthStore()
    resetBrowserRuntime()
    const clientB = getBrowserClient()
    const storeB = getAuthStore()
    expect(clientA).not.toBe(clientB)
    expect(storeA).not.toBe(storeB)
  })

  it('does not access window/document at module level', async () => {
    const originalWindow = globalThis.window
    const originalDocument = globalThis.document
    // @ts-expect-error testing SSR safety
    delete globalThis.window
    // @ts-expect-error testing SSR safety
    delete globalThis.document

    resetBrowserRuntime()
    const client = getBrowserClient()
    expect(client).toBeDefined()

    globalThis.window = originalWindow
    globalThis.document = originalDocument
  })
})

describe('client exports shape', () => {
  it('exports expected symbols', async () => {
    const mod = await import('../src/client')
    expect(typeof mod.useEnfyra).toBe('function')
    expect(typeof mod.useAuth).toBe('function')
    expect(typeof mod.useQuery).toBe('function')
    expect(typeof mod.useMutation).toBe('function')
    expect(typeof mod.useStorage).toBe('function')
    expect(typeof mod.enfyra).toBe('function')
  })
})
