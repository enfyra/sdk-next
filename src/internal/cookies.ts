export interface ParsedSetCookie {
  name: string
  value: string
  path?: string
  domain?: string
  expires?: Date
  maxAge?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  priority?: 'low' | 'medium' | 'high'
  partitioned?: boolean
}

export function parseSetCookieHeader(header: string): ParsedSetCookie | null {
  const segments = header.split(';')
  if (segments.length === 0) return null

  const nameValue = segments[0].trim()
  const eqIndex = nameValue.indexOf('=')
  if (eqIndex === -1) return null

  const name = nameValue.slice(0, eqIndex).trim()
  const value = nameValue.slice(eqIndex + 1).trim()

  if (!name) return null

  const cookie: ParsedSetCookie = { name, value }

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i].trim()
    if (!segment) continue

    const segEq = segment.indexOf('=')
    const key = (segEq === -1 ? segment : segment.slice(0, segEq)).trim().toLowerCase()
    const val = segEq === -1 ? undefined : segment.slice(segEq + 1).trim()

    switch (key) {
      case 'path':
        cookie.path = val
        break
      case 'domain':
        cookie.domain = val
        break
      case 'expires':
        if (val) cookie.expires = new Date(val)
        break
      case 'max-age':
        if (val) cookie.maxAge = parseInt(val, 10)
        break
      case 'httponly':
        cookie.httpOnly = true
        break
      case 'secure':
        cookie.secure = true
        break
      case 'samesite':
        if (val) {
          const lower = val.toLowerCase()
          if (lower === 'strict') cookie.sameSite = 'strict'
          else if (lower === 'lax') cookie.sameSite = 'lax'
          else if (lower === 'none') cookie.sameSite = 'none'
        }
        break
      case 'priority':
        if (val) {
          const lower = val.toLowerCase()
          if (lower === 'low') cookie.priority = 'low'
          else if (lower === 'medium') cookie.priority = 'medium'
          else if (lower === 'high') cookie.priority = 'high'
        }
        break
      case 'partitioned':
        cookie.partitioned = true
        break
    }
  }

  return cookie
}

export function parseSetCookieHeaders(headers: string[]): ParsedSetCookie[] {
  const result: ParsedSetCookie[] = []
  for (const header of headers) {
    const parsed = parseSetCookieHeader(header)
    if (parsed) result.push(parsed)
  }
  return result
}
