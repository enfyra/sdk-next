import type { NextConfig } from 'next'

export interface EnfyraNextConfigOptions {
  appUrl?: string
  routePrefix?: string
  realtime?: boolean
}

export type NextConfigInput =
  | NextConfig
  | ((phase: string, context: { defaultConfig: NextConfig }) => NextConfig)
  | ((phase: string, context: { defaultConfig: NextConfig }) => Promise<NextConfig>)

export interface EnfyraRewriteRule {
  source: string
  destination: string
  basePath?: false
}
