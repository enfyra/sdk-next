import { describe, it, expect } from 'vitest'
import { parseSetCookieHeader, parseSetCookieHeaders } from '../src/internal/cookies'

describe('parseSetCookieHeader', () => {
  it('parses simple name=value', () => {
    const result = parseSetCookieHeader('session=abc123')
    expect(result).toEqual({ name: 'session', value: 'abc123' })
  })

  it('parses with path and httpOnly', () => {
    const result = parseSetCookieHeader('token=xyz; Path=/; HttpOnly')
    expect(result).toEqual({
      name: 'token',
      value: 'xyz',
      path: '/',
      httpOnly: true,
    })
  })

  it('parses full attributes', () => {
    const result = parseSetCookieHeader(
      'id=val; Path=/api; Domain=.example.com; Max-Age=3600; Secure; SameSite=Strict; Priority=High; Partitioned',
    )
    expect(result).toEqual({
      name: 'id',
      value: 'val',
      path: '/api',
      domain: '.example.com',
      maxAge: 3600,
      secure: true,
      sameSite: 'strict',
      priority: 'high',
      partitioned: true,
    })
  })

  it('parses Expires with comma in date', () => {
    const result = parseSetCookieHeader(
      'sid=abc; Expires=Thu, 01 Jan 2030 00:00:00 GMT; Path=/',
    )
    expect(result?.name).toBe('sid')
    expect(result?.expires).toBeInstanceOf(Date)
    expect(result?.expires?.getFullYear()).toBe(2030)
    expect(result?.path).toBe('/')
  })

  it('parses SameSite=Lax', () => {
    const result = parseSetCookieHeader('a=b; SameSite=Lax')
    expect(result?.sameSite).toBe('lax')
  })

  it('parses SameSite=None with Secure', () => {
    const result = parseSetCookieHeader('a=b; SameSite=None; Secure')
    expect(result?.sameSite).toBe('none')
    expect(result?.secure).toBe(true)
  })

  it('returns null for empty string', () => {
    expect(parseSetCookieHeader('')).toBeNull()
  })

  it('returns null for missing =', () => {
    expect(parseSetCookieHeader('invalidcookie')).toBeNull()
  })

  it('handles value with = sign', () => {
    const result = parseSetCookieHeader('token=abc=def=ghi; Path=/')
    expect(result?.name).toBe('token')
    expect(result?.value).toBe('abc=def=ghi')
  })
})

describe('parseSetCookieHeaders', () => {
  it('parses multiple headers', () => {
    const results = parseSetCookieHeaders([
      'a=1; Path=/',
      'b=2; HttpOnly',
    ])
    expect(results).toHaveLength(2)
    expect(results[0].name).toBe('a')
    expect(results[1].name).toBe('b')
  })

  it('skips invalid entries', () => {
    const results = parseSetCookieHeaders(['valid=yes', 'invalid', 'also=ok'])
    expect(results).toHaveLength(2)
  })
})
