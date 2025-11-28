/**
 * Hardcoded API prefix for all Enfyra SDK routes
 * This ensures no conflicts with application routes
 */
export const ENFYRA_API_PREFIX = "/enfyra/api";

export interface EnfyraSDKConfig {
  apiUrl: string;
  apiPrefix?: string;
}

/**
 * Get SDK config from environment variables (injected by plugin)
 * Server-side only: includes apiUrl
 */
export function getEnfyraSDKConfig(): EnfyraSDKConfig {
  return {
    apiUrl: process.env.ENFYRA_API_URL || '',
    apiPrefix: process.env.ENFYRA_API_PREFIX || ENFYRA_API_PREFIX,
  };
}

/**
 * Get SDK config for client-side usage
 * Client-safe: only exposes apiPrefix (apiUrl is server-only for security)
 */
export function getEnfyraSDKConfigClient(): Pick<EnfyraSDKConfig, 'apiPrefix'> {
  return {
    apiPrefix: process.env.NEXT_PUBLIC_ENFYRA_API_PREFIX || ENFYRA_API_PREFIX,
  };
}

