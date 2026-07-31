import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockHeadersGet = vi.fn()
const mockCookiesGetAll = vi.fn()
const mockCookiesSet = vi.fn()
const mockCookiesDelete = vi.fn()

vi.mock('next/headers', () => ({
  headers: async () => ({ get: mockHeadersGet }),
  cookies: async () => ({
    getAll: mockCookiesGetAll,
    set: mockCookiesSet,
    delete: mockCookiesDelete,
  }),
}))

vi.mock('server-only', () => ({}))

describe('createServerEnfyra', () => {
  beforeEach(() => {
    process.env.ENFYRA_APP_URL = 'http://localhost:3000'
    mockHeadersGet.mockReset()
  })

  afterEach(() => {
    delete process.env.ENFYRA_APP_URL
  })

  it('creates a new client per call (request-scoped)', async () => {
    mockHeadersGet.mockImplementation((name: string) => {
      if (name === 'cookie') return 'session=aaa'
      return null
    })

    const { createServerEnfyra } = await import('../src/server')
    const clientA = await createServerEnfyra()
    const clientB = await createServerEnfyra()

    expect(clientA).not.toBe(clientB)
  })

  it('forwards cookie header to client', async () => {
    mockHeadersGet.mockImplementation((name: string) => {
      if (name === 'cookie') return 'session=abc123'
      return null
    })

    const { createServerEnfyra } = await import('../src/server')
    const client = await createServerEnfyra()
    const http = client.getHttpClient()

    expect(http).toBeDefined()
  })

  it('forwards authorization header to client', async () => {
    mockHeadersGet.mockImplementation((name: string) => {
      if (name === 'authorization') return 'Bearer token123'
      return null
    })

    const { createServerEnfyra } = await import('../src/server')
    const client = await createServerEnfyra()

    expect(client).toBeDefined()
  })

  it('two requests with different cookies get isolated clients', async () => {
    const { createServerEnfyra } = await import('../src/server')

    mockHeadersGet.mockImplementation((name: string) => {
      if (name === 'cookie') return 'session=user1'
      return null
    })
    const client1 = await createServerEnfyra()

    mockHeadersGet.mockImplementation((name: string) => {
      if (name === 'cookie') return 'session=user2'
      return null
    })
    const client2 = await createServerEnfyra()

    expect(client1).not.toBe(client2)
  })
})

describe('createServerActionEnfyra', () => {
  beforeEach(() => {
    process.env.ENFYRA_APP_URL = 'http://localhost:3000'
    mockCookiesGetAll.mockReset()
    mockCookiesSet.mockReset()
    mockCookiesDelete.mockReset()
  })

  afterEach(() => {
    delete process.env.ENFYRA_APP_URL
  })

  it('reads cookies from cookie store', async () => {
    mockCookiesGetAll.mockReturnValue([
      { name: 'session', value: 'abc' },
      { name: 'theme', value: 'dark' },
    ])

    const { createServerActionEnfyra } = await import('../src/server')
    const { client } = await createServerActionEnfyra()

    expect(client).toBeDefined()
    expect(mockCookiesGetAll).toHaveBeenCalled()
  })

  it('applySetCookies writes parsed cookies to store', async () => {
    mockCookiesGetAll.mockReturnValue([])

    const { createServerActionEnfyra } = await import('../src/server')
    const { applySetCookies } = await createServerActionEnfyra()

    applySetCookies([
      'session=newval; Path=/; HttpOnly; Secure; SameSite=Lax',
      'refresh=rotated; Path=/auth; Max-Age=86400',
    ])

    expect(mockCookiesSet).toHaveBeenCalledTimes(2)
    expect(mockCookiesSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'session',
        value: 'newval',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      }),
    )
    expect(mockCookiesSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'refresh',
        value: 'rotated',
        path: '/auth',
        maxAge: 86400,
      }),
    )
  })

  it('applySetCookies deletes expired cookies', async () => {
    mockCookiesGetAll.mockReturnValue([])

    const { createServerActionEnfyra } = await import('../src/server')
    const { applySetCookies } = await createServerActionEnfyra()

    applySetCookies(['session=; Max-Age=0; Path=/'])

    expect(mockCookiesDelete).toHaveBeenCalledWith('session')
    expect(mockCookiesSet).not.toHaveBeenCalled()
  })

  it('applySetCookies deletes cookies with past Expires', async () => {
    mockCookiesGetAll.mockReturnValue([])

    const { createServerActionEnfyra } = await import('../src/server')
    const { applySetCookies } = await createServerActionEnfyra()

    applySetCookies(['old=val; Expires=Thu, 01 Jan 2020 00:00:00 GMT; Path=/'])

    expect(mockCookiesDelete).toHaveBeenCalledWith('old')
  })

  it('handles empty set-cookie array gracefully', async () => {
    mockCookiesGetAll.mockReturnValue([])

    const { createServerActionEnfyra } = await import('../src/server')
    const { applySetCookies } = await createServerActionEnfyra()

    applySetCookies([])

    expect(mockCookiesSet).not.toHaveBeenCalled()
    expect(mockCookiesDelete).not.toHaveBeenCalled()
  })
})
