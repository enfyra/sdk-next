import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  resolveAppUrl,
  resolveRoutePrefix,
  resolveConfig,
  assertNoStaticExport,
  assertNoEnvCollision,
  RESERVED_ENV_KEY,
} from '../src/internal/config'

describe('resolveAppUrl', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.ENFYRA_APP_URL
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('resolves from explicit option', () => {
    expect(resolveAppUrl({ appUrl: 'http://localhost:3000' })).toBe('http://localhost:3000')
  })

  it('resolves from env', () => {
    process.env.ENFYRA_APP_URL = 'https://enfyra.example.com'
    expect(resolveAppUrl()).toBe('https://enfyra.example.com')
  })

  it('explicit overrides env', () => {
    process.env.ENFYRA_APP_URL = 'https://env.example.com'
    expect(resolveAppUrl({ appUrl: 'https://explicit.example.com' })).toBe('https://explicit.example.com')
  })

  it('strips trailing slash', () => {
    expect(resolveAppUrl({ appUrl: 'http://localhost:3000/' })).toBe('http://localhost:3000')
    expect(resolveAppUrl({ appUrl: 'http://localhost:3000///' })).toBe('http://localhost:3000')
  })

  it('throws when no URL available', () => {
    expect(() => resolveAppUrl()).toThrow('Missing Enfyra URL')
  })

  it('throws for invalid URL', () => {
    expect(() => resolveAppUrl({ appUrl: 'not-a-url' })).toThrow('not a valid URL')
  })

  it('throws for non-http protocol', () => {
    expect(() => resolveAppUrl({ appUrl: 'ftp://localhost:3000' })).toThrow('must use http or https')
  })

  it('throws for URL with path', () => {
    expect(() => resolveAppUrl({ appUrl: 'http://localhost:3000/api' })).toThrow('must point to the origin root')
  })
})

describe('resolveRoutePrefix', () => {
  it('defaults to /api/enfyra', () => {
    expect(resolveRoutePrefix()).toBe('/api/enfyra')
  })

  it('uses custom prefix', () => {
    expect(resolveRoutePrefix({ routePrefix: '/custom/proxy' })).toBe('/custom/proxy')
  })

  it('strips trailing slash', () => {
    expect(resolveRoutePrefix({ routePrefix: '/api/enfyra/' })).toBe('/api/enfyra')
  })

  it('throws for prefix without leading slash', () => {
    expect(() => resolveRoutePrefix({ routePrefix: 'api/enfyra' })).toThrow('must start with "/"')
  })
})

describe('resolveConfig', () => {
  beforeEach(() => {
    delete process.env.ENFYRA_APP_URL
  })

  it('resolves full config', () => {
    const config = resolveConfig({ appUrl: 'http://localhost:3000', realtime: true })
    expect(config).toEqual({
      appUrl: 'http://localhost:3000',
      routePrefix: '/api/enfyra',
      realtime: true,
    })
  })

  it('defaults realtime to false', () => {
    const config = resolveConfig({ appUrl: 'http://localhost:3000' })
    expect(config.realtime).toBe(false)
  })
})

describe('assertNoStaticExport', () => {
  it('passes for normal config', () => {
    expect(() => assertNoStaticExport({})).not.toThrow()
    expect(() => assertNoStaticExport({ output: 'standalone' })).not.toThrow()
  })

  it('throws for static export', () => {
    expect(() => assertNoStaticExport({ output: 'export' })).toThrow('output: "export" is not supported')
  })
})

describe('assertNoEnvCollision', () => {
  afterEach(() => {
    delete process.env[RESERVED_ENV_KEY]
  })

  it('passes when reserved key is unset', () => {
    delete process.env[RESERVED_ENV_KEY]
    expect(() => assertNoEnvCollision()).not.toThrow()
  })

  it('throws when reserved key is set', () => {
    process.env[RESERVED_ENV_KEY] = '/something'
    expect(() => assertNoEnvCollision()).toThrow('Reserved env key')
  })
})
