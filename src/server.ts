import 'server-only'
import { headers, cookies } from 'next/headers'
import type { EnfyraClient } from '@enfyra/sdk-core'
import { createRequestClient } from './internal/server-client'
import { parseSetCookieHeaders } from './internal/cookies'
import type { ParsedSetCookie } from './internal/cookies'

export async function createServerEnfyra(): Promise<EnfyraClient> {
  const headerStore = await headers()
  const cookieHeader = headerStore.get('cookie')
  const authorization = headerStore.get('authorization')
  return createRequestClient(cookieHeader, authorization)
}

export interface ServerActionEnfyra {
  client: EnfyraClient
  applySetCookies: (setCookieHeaders: string[]) => void
}

export async function createServerActionEnfyra(): Promise<ServerActionEnfyra> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')

  const client = createRequestClient(cookieHeader || null, null)

  const applySetCookies = (setCookieHeaders: string[]) => {
    const parsed = parseSetCookieHeaders(setCookieHeaders)
    for (const cookie of parsed) {
      applyCookieToStore(cookieStore, cookie)
    }
  }

  return { client, applySetCookies }
}

function applyCookieToStore(
  store: Awaited<ReturnType<typeof cookies>>,
  cookie: ParsedSetCookie,
): void {
  if (cookie.maxAge === 0 || (cookie.expires && cookie.expires.getTime() <= Date.now())) {
    store.delete(cookie.name)
    return
  }

  store.set({
    name: cookie.name,
    value: cookie.value,
    path: cookie.path ?? '/',
    domain: cookie.domain,
    expires: cookie.expires,
    maxAge: cookie.maxAge,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
  })
}

export type { ParsedSetCookie }
