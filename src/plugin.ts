import type { NextConfig } from 'next';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface EnfyraConfig {
  apiUrl: string;
  apiPrefix?: string;
}

export interface WithEnfyraOptions {
  enfyraSDK: EnfyraConfig;
}

/**
 * Automatically copy templates if they don't exist
 * This ensures templates are always available, even if postinstall didn't run
 */
function ensureTemplatesCopied() {
  try {
    // Find project root (where Next.js config is)
    const projectRoot = process.cwd();
    const appDir = join(projectRoot, 'app');
    const middlewarePath = join(projectRoot, 'middleware.ts');
    const apiRoutesPath = join(appDir, 'api', 'enfyra');

    // Always try to copy if app directory exists (idempotent - won't overwrite existing files)
    if (existsSync(appDir)) {
      try {
        // Try to find copy script from installed SDK
        let copyScript: string | null = null;
        
        // Method 1: Try require.resolve
        try {
          const sdkPath = require.resolve('@enfyra/sdk-next/package.json');
          copyScript = join(sdkPath, '..', 'scripts', 'copy-templates.js');
        } catch (e) {
          // Method 2: Try to find in node_modules
          const nodeModulesScript = join(projectRoot, 'node_modules', '@enfyra', 'sdk-next', 'scripts', 'copy-templates.js');
          if (existsSync(nodeModulesScript)) {
            copyScript = nodeModulesScript;
          }
        }

        if (copyScript && existsSync(copyScript)) {
          console.log('[Enfyra SDK] Copying templates automatically...');
          execSync(`node "${copyScript}"`, { 
            stdio: 'inherit', 
            cwd: projectRoot,
            env: { ...process.env }
          });
        } else {
          console.warn('[Enfyra SDK] Could not find copy-templates.js script. Templates may not be copied.');
        }
      } catch (e: any) {
        console.warn('[Enfyra SDK] Failed to copy templates automatically:', e?.message || e);
      }
    }
  } catch (e: any) {
    console.warn('[Enfyra SDK] Error checking templates:', e?.message || e);
  }
}

/**
 * Next.js plugin for Enfyra SDK
 * 
 * This plugin:
 * - Injects environment variables for runtime access
 * - Middleware and API routes are handled automatically via Next.js file-based routing
 * - Files from templates/ directory should be copied to app/ directory during build
 * 
 * @example
 * **CommonJS (next.config.js):**
 * ```js
 * const { withEnfyra } = require('@enfyra/sdk-next/plugin');
 * 
 * module.exports = withEnfyra(
 *   {
 *     // Your existing Next.js config options
 *     reactStrictMode: true,
 *     // ... other config
 *   },
 *   {
 *     enfyraSDK: {
 *       apiUrl: process.env.ENFYRA_API_URL || 'http://localhost:1105',
 *       apiPrefix: '/enfyra/api', // Optional, defaults to '/enfyra/api'
 *     }
 *   }
 * );
 * ```
 * 
 * @example
 * **ES Modules (next.config.mjs):**
 * ```js
 * import { withEnfyra } from '@enfyra/sdk-next/plugin';
 * 
 * export default withEnfyra(
 *   {
 *     // Your existing Next.js config options
 *     reactStrictMode: true,
 *     // ... other config
 *   },
 *   {
 *     enfyraSDK: {
 *       apiUrl: process.env.ENFYRA_API_URL || 'https://api.enfyra.com',
 *       apiPrefix: '/enfyra/api', // Optional
 *     }
 *   }
 * );
 * ```
 * 
 * @example
 * **TypeScript (next.config.ts):**
 * ```ts
 * import type { NextConfig } from 'next';
 * import { withEnfyra } from '@enfyra/sdk-next/plugin';
 * 
 * const nextConfig: NextConfig = {
 *   reactStrictMode: true,
 *   // ... other config
 * };
 * 
 * export default withEnfyra(nextConfig, {
 *   enfyraSDK: {
 *     apiUrl: process.env.ENFYRA_API_URL!,
 *     apiPrefix: '/enfyra/api', // Optional
 *   }
 * });
 * ```
 * 
 * @param nextConfig - Your existing Next.js configuration object
 * @param options - Configuration options for Enfyra SDK
 * @param options.enfyraSDK - Enfyra SDK configuration
 * @param options.enfyraSDK.apiUrl - **Required.** The base URL of your Enfyra API backend (e.g., 'https://api.enfyra.com' or 'http://localhost:1105')
 * @param options.enfyraSDK.apiPrefix - **Optional.** The API prefix for Enfyra routes. Defaults to '/enfyra/api'
 * 
 * @returns Next.js configuration object with Enfyra SDK environment variables injected
 * 
 * @remarks
 * - Make sure to set `ENFYRA_API_URL` in your `.env.local` file
 * - The plugin automatically sets `ENFYRA_API_PREFIX` and `NEXT_PUBLIC_ENFYRA_API_PREFIX` environment variables
 * - Middleware and API routes are automatically copied during package installation via `postinstall` script
 */
export function withEnfyra(
  nextConfig: NextConfig = {},
  options: WithEnfyraOptions
): NextConfig {
  // Ensure templates are copied when plugin is loaded
  ensureTemplatesCopied();

  const { enfyraSDK } = options;

  if (!enfyraSDK?.apiUrl) {
    console.warn(
      `[Enfyra SDK Next] Missing required configuration:\n` +
        `- enfyraSDK.apiUrl is required\n` +
        `Please configure it in your next.config.js:\n` +
        `const { withEnfyra } = require('@enfyra/sdk-next/plugin');\n` +
        `module.exports = withEnfyra({}, {\n` +
        `  enfyraSDK: {\n` +
        `    apiUrl: 'https://your-api-url'\n` +
        `  }\n` +
        `});`
    );
  }

  // Normalize apiUrl
  const normalizedApiUrl =
    typeof enfyraSDK?.apiUrl === 'string'
      ? enfyraSDK.apiUrl.replace(/\/+$/, '')
      : '';

  // Store config in env for runtime access
  const env = {
    ...nextConfig.env,
    ENFYRA_API_URL: normalizedApiUrl,
    ENFYRA_API_PREFIX: enfyraSDK?.apiPrefix || '/enfyra/api',
    NEXT_PUBLIC_ENFYRA_API_PREFIX: enfyraSDK?.apiPrefix || '/enfyra/api',
  };

  return {
    ...nextConfig,
    env,
  };
}

