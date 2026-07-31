import { EnfyraClient } from '@enfyra/sdk-core'
import { resolveAppUrl } from './config'

export function createRequestClient(cookieHeader?: string | null, authorization?: string | null): EnfyraClient {
  const appUrl = resolveAppUrl()

  const client = new EnfyraClient({
    baseUrl: appUrl,
    auth: { strategy: 'cookie' },
  })

  const http = client.getHttpClient()

  if (cookieHeader) {
    http.setHeader('Cookie', cookieHeader)
  }
  if (authorization) {
    http.setHeader('Authorization', authorization)
  }

  return client
}
