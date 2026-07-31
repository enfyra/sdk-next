import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import enfyraPreset, { withEnfyra } from '../src/index'
import { RESERVED_ENV_KEY } from '../src/internal/config'
import type { NextConfig } from 'next'

describe('enfyraPreset (default export)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ENFYRA_APP_URL: 'http://localhost:3000' }
    delete process.env[RESERVED_ENV_KEY]
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns valid NextConfig when called with no args (phase simulation)', () => {
    const config = enfyraPreset('phase-production-build', { defaultConfig: {} }) as NextConfig
    expect(config).toBeDefined()
    expect(config.env?.[RESERVED_ENV_KEY]).toBe('/api/enfyra')
    expect(typeof config.rewrites).toBe('function')
  })

  it('returns valid NextConfig when called as factory with options', () => {
    const config = enfyraPreset({ appUrl: 'https://my.enfyra.dev' }) as NextConfig
    expect(config.env?.[RESERVED_ENV_KEY]).toBe('/api/enfyra')
  })

  it('injects browser prefix with basePath', () => {
    const config = enfyraPreset({ appUrl: 'http://localhost:3000' }) as NextConfig
    const withBase = { ...config, basePath: '/app' }
    const reApplied = withEnfyra(withBase, { appUrl: 'http://localhost:3000' }) as NextConfig
    expect(reApplied.env?.[RESERVED_ENV_KEY]).toBe('/app/api/enfyra')
  })

  it('rewrites resolves to beforeFiles with enfyra rules first', async () => {
    const config = enfyraPreset({ appUrl: 'http://localhost:3000' }) as NextConfig
    const rewrites = await (config.rewrites as () => Promise<{ beforeFiles: unknown[] }>)()
    expect(rewrites.beforeFiles[0]).toEqual({
      source: '/api/enfyra/:path*',
      destination: 'http://localhost:3000/api/:path*',
    })
  })

  it('throws for output export via withEnfyra', () => {
    expect(() => withEnfyra({ output: 'export' })).toThrow('output: "export" is not supported')
  })
})

describe('withEnfyra', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ENFYRA_APP_URL: 'http://localhost:3000' }
    delete process.env[RESERVED_ENV_KEY]
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('wraps object config preserving existing fields', () => {
    const existing: NextConfig = {
      reactStrictMode: true,
      images: { domains: ['cdn.example.com'] },
    }
    const wrapped = withEnfyra(existing) as NextConfig
    expect(wrapped.reactStrictMode).toBe(true)
    expect(wrapped.images?.domains).toContain('cdn.example.com')
    expect(typeof wrapped.rewrites).toBe('function')
  })

  it('wraps sync function config', async () => {
    const fn = (_phase: string, _ctx: { defaultConfig: NextConfig }): NextConfig => ({
      reactStrictMode: false,
    })
    const wrapped = withEnfyra(fn)
    expect(typeof wrapped).toBe('function')
    const resolved = await (wrapped as (p: string, c: { defaultConfig: NextConfig }) => Promise<NextConfig>)('phase', { defaultConfig: {} })
    expect(resolved.reactStrictMode).toBe(false)
    expect(resolved.env?.[RESERVED_ENV_KEY]).toBe('/api/enfyra')
  })

  it('wraps async function config', async () => {
    const fn = async (_phase: string, _ctx: { defaultConfig: NextConfig }): Promise<NextConfig> => ({
      poweredByHeader: false,
    })
    const wrapped = withEnfyra(fn)
    const resolved = await (wrapped as (p: string, c: { defaultConfig: NextConfig }) => Promise<NextConfig>)('phase', { defaultConfig: {} })
    expect(resolved.poweredByHeader).toBe(false)
    expect(typeof resolved.rewrites).toBe('function')
  })

  it('merges existing array rewrites', async () => {
    const existing: NextConfig = {
      rewrites: async () => [{ source: '/old/:path*', destination: '/new/:path*' }],
    }
    const wrapped = withEnfyra(existing, { appUrl: 'http://localhost:3000' }) as NextConfig
    const rewrites = await (wrapped.rewrites as () => Promise<{ beforeFiles: Array<{ source: string }> }>)()
    expect(rewrites.beforeFiles[0].source).toBe('/api/enfyra/:path*')
    expect(rewrites.beforeFiles[1].source).toBe('/old/:path*')
  })

  it('merges existing object rewrites preserving afterFiles and fallback', async () => {
    const existing: NextConfig = {
      rewrites: async () => ({
        beforeFiles: [{ source: '/bf/:path*', destination: '/bf-dest/:path*' }],
        afterFiles: [{ source: '/af/:path*', destination: '/af-dest/:path*' }],
        fallback: [{ source: '/fb/:path*', destination: '/fb-dest/:path*' }],
      }),
    }
    const wrapped = withEnfyra(existing, { appUrl: 'http://localhost:3000' }) as NextConfig
    const rewrites = await (wrapped.rewrites as () => Promise<{ beforeFiles: Array<{ source: string }>; afterFiles: unknown[]; fallback: unknown[] }>)()
    expect(rewrites.beforeFiles[0].source).toBe('/api/enfyra/:path*')
    expect(rewrites.beforeFiles[1].source).toBe('/bf/:path*')
    expect(rewrites.afterFiles).toHaveLength(1)
    expect(rewrites.fallback).toHaveLength(1)
  })

  it('custom routePrefix', async () => {
    const wrapped = withEnfyra({}, { appUrl: 'http://localhost:3000', routePrefix: '/proxy/enfyra' }) as NextConfig
    expect(wrapped.env?.[RESERVED_ENV_KEY]).toBe('/proxy/enfyra')
    const rewrites = await (wrapped.rewrites as () => Promise<{ beforeFiles: Array<{ source: string }> }>)()
    expect(rewrites.beforeFiles[0].source).toBe('/proxy/enfyra/:path*')
  })

  it('realtime adds socket.io rule before HTTP rule', async () => {
    const wrapped = withEnfyra({}, { appUrl: 'http://localhost:3000', realtime: true }) as NextConfig
    const rewrites = await (wrapped.rewrites as () => Promise<{ beforeFiles: Array<{ source: string; destination: string }> }>)()
    expect(rewrites.beforeFiles[0]).toEqual({
      source: '/api/enfyra/socket.io/:path*',
      destination: 'http://localhost:3000/socket.io/:path*',
    })
    expect(rewrites.beforeFiles[1].source).toBe('/api/enfyra/:path*')
  })

  it('throws for output export', () => {
    expect(() => withEnfyra({ output: 'export' })).toThrow('output: "export" is not supported')
  })

  it('throws when reserved env key already set', () => {
    process.env[RESERVED_ENV_KEY] = '/conflict'
    expect(() => withEnfyra({})).toThrow('Reserved env key')
  })
})
