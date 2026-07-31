import type { EnfyraNextConfigOptions } from '../types'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const DEFAULT_ROUTE_PREFIX = '/api/enfyra'
const RESERVED_ENV_KEY = 'ENFYRA_ROUTE_PREFIX'

export interface ResolvedConfig {
  appUrl: string
  routePrefix: string
  realtime: boolean
}

export function resolveAppUrl(options?: EnfyraNextConfigOptions): string {
  const explicit = options?.appUrl
  const fromEnv = process.env.ENFYRA_APP_URL

  const raw = explicit ?? fromEnv

  if (!raw) {
    throw new Error(
      '[@enfyra/sdk-next] Missing Enfyra URL. Set ENFYRA_APP_URL env or pass appUrl in config options.',
    )
  }

  const url = raw.replace(/\/+$/, '')
  validateAppUrl(url)
  return url
}

function validateAppUrl(raw: string): void {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error(
      `[@enfyra/sdk-next] Invalid ENFYRA_APP_URL: "${raw}" is not a valid URL.`,
    )
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `[@enfyra/sdk-next] ENFYRA_APP_URL must use http or https, got "${parsed.protocol}".`,
    )
  }

  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new Error(
      `[@enfyra/sdk-next] ENFYRA_APP_URL must point to the origin root, got path "${parsed.pathname}". Remove any path suffix.`,
    )
  }
}

export function resolveRoutePrefix(options?: EnfyraNextConfigOptions): string {
  const prefix = options?.routePrefix ?? DEFAULT_ROUTE_PREFIX
  if (!prefix.startsWith('/')) {
    throw new Error(
      `[@enfyra/sdk-next] routePrefix must start with "/", got "${prefix}".`,
    )
  }
  return prefix.replace(/\/+$/, '')
}

export function resolveConfig(options?: EnfyraNextConfigOptions): ResolvedConfig {
  return {
    appUrl: resolveAppUrl(options),
    routePrefix: resolveRoutePrefix(options),
    realtime: options?.realtime ?? false,
  }
}

export function assertNoStaticExport(config: { output?: string }): void {
  if (config.output === 'export') {
    throw new Error(
      '[@enfyra/sdk-next] output: "export" is not supported. The SDK requires Next.js server rewrites for same-origin proxy and cookie bridge.',
    )
  }
}

export function assertNoEnvCollision(): void {
  if (process.env[RESERVED_ENV_KEY] !== undefined) {
    throw new Error(
      `[@enfyra/sdk-next] Reserved env key "${RESERVED_ENV_KEY}" is already set. Remove it from your environment.`,
    )
  }
}

export function assertNoRouteCollision(routePrefix: string): void {
  const cwd = process.cwd()
  const appRouterPath = resolve(cwd, `app${routePrefix}`)
  const pagesRouterPath = resolve(cwd, `pages${routePrefix}`)

  if (existsSync(appRouterPath)) {
    throw new Error(
      `[@enfyra/sdk-next] Route collision: directory "app${routePrefix}" already exists. ` +
      `The SDK owns this prefix for its proxy rewrite. Move your route handler or set a different routePrefix.`,
    )
  }
  if (existsSync(pagesRouterPath)) {
    throw new Error(
      `[@enfyra/sdk-next] Route collision: directory "pages${routePrefix}" already exists. ` +
      `The SDK owns this prefix for its proxy rewrite. Move your route handler or set a different routePrefix.`,
    )
  }
}

export { RESERVED_ENV_KEY, DEFAULT_ROUTE_PREFIX }
