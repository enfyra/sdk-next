import type { EnfyraRewriteRule } from '../types'
import type { ResolvedConfig } from './config'

export function buildRewriteRules(config: ResolvedConfig): EnfyraRewriteRule[] {
  const rules: EnfyraRewriteRule[] = []

  if (config.realtime) {
    rules.push({
      source: `${config.routePrefix}/socket.io/:path*`,
      destination: `${config.appUrl}/socket.io/:path*`,
    })
  }

  rules.push({
    source: `${config.routePrefix}/:path*`,
    destination: `${config.appUrl}/api/:path*`,
  })

  return rules
}

export type ExistingRewrites =
  | EnfyraRewriteRule[]
  | {
      beforeFiles?: EnfyraRewriteRule[]
      afterFiles?: EnfyraRewriteRule[]
      fallback?: EnfyraRewriteRule[]
    }

export async function mergeRewrites(
  existing: ExistingRewrites | (() => Promise<ExistingRewrites>) | undefined,
  enfyraRules: EnfyraRewriteRule[],
): Promise<{ beforeFiles: EnfyraRewriteRule[]; afterFiles: EnfyraRewriteRule[]; fallback: EnfyraRewriteRule[] }> {
  let resolved: ExistingRewrites | undefined

  if (typeof existing === 'function') {
    resolved = await existing()
  } else {
    resolved = existing
  }

  if (Array.isArray(resolved) || resolved === undefined) {
    return {
      beforeFiles: [...enfyraRules, ...(resolved ?? [])],
      afterFiles: [],
      fallback: [],
    }
  }

  return {
    beforeFiles: [...enfyraRules, ...(resolved.beforeFiles ?? [])],
    afterFiles: resolved.afterFiles ?? [],
    fallback: resolved.fallback ?? [],
  }
}
