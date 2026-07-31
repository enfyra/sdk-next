import { describe, it, expect } from 'vitest'
import { buildRewriteRules, mergeRewrites } from '../src/internal/rewrites'
import type { ResolvedConfig } from '../src/internal/config'

const baseConfig: ResolvedConfig = {
  appUrl: 'http://localhost:3000',
  routePrefix: '/api/enfyra',
  realtime: false,
}

describe('buildRewriteRules', () => {
  it('builds HTTP proxy rule', () => {
    const rules = buildRewriteRules(baseConfig)
    expect(rules).toEqual([
      { source: '/api/enfyra/:path*', destination: 'http://localhost:3000/api/:path*' },
    ])
  })

  it('prepends socket.io rule when realtime enabled', () => {
    const rules = buildRewriteRules({ ...baseConfig, realtime: true })
    expect(rules).toHaveLength(2)
    expect(rules[0]).toEqual({
      source: '/api/enfyra/socket.io/:path*',
      destination: 'http://localhost:3000/socket.io/:path*',
    })
    expect(rules[1].source).toBe('/api/enfyra/:path*')
  })

  it('uses custom route prefix', () => {
    const rules = buildRewriteRules({ ...baseConfig, routePrefix: '/proxy/enfyra' })
    expect(rules[0].source).toBe('/proxy/enfyra/:path*')
    expect(rules[0].destination).toBe('http://localhost:3000/api/:path*')
  })
})

describe('mergeRewrites', () => {
  const enfyraRules = buildRewriteRules(baseConfig)

  it('handles undefined existing rewrites', async () => {
    const result = await mergeRewrites(undefined, enfyraRules)
    expect(result.beforeFiles).toEqual(enfyraRules)
    expect(result.afterFiles).toEqual([])
    expect(result.fallback).toEqual([])
  })

  it('prepends to array rewrites', async () => {
    const existing = [{ source: '/old/:path*', destination: '/new/:path*' }]
    const result = await mergeRewrites(existing, enfyraRules)
    expect(result.beforeFiles).toEqual([...enfyraRules, ...existing])
  })

  it('prepends to object beforeFiles', async () => {
    const existing = {
      beforeFiles: [{ source: '/a/:path*', destination: '/b/:path*' }],
      afterFiles: [{ source: '/c/:path*', destination: '/d/:path*' }],
      fallback: [{ source: '/e/:path*', destination: '/f/:path*' }],
    }
    const result = await mergeRewrites(existing, enfyraRules)
    expect(result.beforeFiles).toEqual([...enfyraRules, ...existing.beforeFiles])
    expect(result.afterFiles).toEqual(existing.afterFiles)
    expect(result.fallback).toEqual(existing.fallback)
  })

  it('handles async function rewrites', async () => {
    const existing = async () => [{ source: '/fn/:path*', destination: '/out/:path*' }]
    const result = await mergeRewrites(existing, enfyraRules)
    expect(result.beforeFiles).toEqual([...enfyraRules, { source: '/fn/:path*', destination: '/out/:path*' }])
  })

  it('handles async function returning object', async () => {
    const existing = async () => ({
      beforeFiles: [{ source: '/x/:path*', destination: '/y/:path*' }],
    })
    const result = await mergeRewrites(existing, enfyraRules)
    expect(result.beforeFiles).toEqual([...enfyraRules, { source: '/x/:path*', destination: '/y/:path*' }])
    expect(result.afterFiles).toEqual([])
  })
})
