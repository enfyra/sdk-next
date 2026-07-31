import type { NextConfig } from 'next'
import type { EnfyraNextConfigOptions, NextConfigInput } from './types'
import {
  resolveConfig,
  assertNoStaticExport,
  assertNoEnvCollision,
  assertNoRouteCollision,
  RESERVED_ENV_KEY,
} from './internal/config'
import { buildRewriteRules, mergeRewrites } from './internal/rewrites'

export type { EnfyraNextConfigOptions, NextConfigInput }

function isPhaseCall(args: unknown[]): args is [string, { defaultConfig: NextConfig }] {
  return (
    args.length >= 1 &&
    typeof args[0] === 'string' &&
    (args.length === 1 || (typeof args[1] === 'object' && args[1] !== null && 'defaultConfig' in (args[1] as object)))
  )
}

function applyEnfyra(base: NextConfig, options?: EnfyraNextConfigOptions): NextConfig {
  assertNoStaticExport(base)
  assertNoEnvCollision()

  const config = resolveConfig(options)
  assertNoRouteCollision(config.routePrefix)
  const enfyraRules = buildRewriteRules(config)
  const existingRewrites = base.rewrites as
    | (() => Promise<unknown>)
    | unknown[]
    | { beforeFiles?: unknown[]; afterFiles?: unknown[]; fallback?: unknown[] }
    | undefined

  const browserPrefix = `${base.basePath ?? ''}${config.routePrefix}`

  return {
    ...base,
    env: {
      ...base.env,
      [RESERVED_ENV_KEY]: browserPrefix,
    },
    rewrites: async () => {
      return mergeRewrites(
        existingRewrites as never,
        enfyraRules,
      )
    },
  }
}

function wrapConfig(input: NextConfigInput, options?: EnfyraNextConfigOptions): NextConfigInput {
  if (typeof input === 'function') {
    return async (phase: string, context: { defaultConfig: NextConfig }) => {
      const resolved = await input(phase, context)
      return applyEnfyra(resolved, options)
    }
  }
  return applyEnfyra(input, options)
}

function enfyraPreset(...args: unknown[]): NextConfig | NextConfigInput {
  if (isPhaseCall(args)) {
    const defaultConfig = (args[1] as { defaultConfig?: NextConfig })?.defaultConfig ?? {}
    return applyEnfyra(defaultConfig)
  }

  const options = (args[0] ?? undefined) as EnfyraNextConfigOptions | undefined
  return applyEnfyra({}, options)
}

export function withEnfyra(nextConfig: NextConfigInput, options?: EnfyraNextConfigOptions): NextConfigInput {
  return wrapConfig(nextConfig, options)
}

export default enfyraPreset
