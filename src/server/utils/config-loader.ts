import type { EnfyraConfig } from '../../plugin';

let cachedConfig: EnfyraConfig | null = null;

export function loadEnfyraConfig(): EnfyraConfig | null {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (typeof window !== 'undefined') {
    return null;
  }

  try {
    const fs = require('node:fs');
    const path = require('node:path');
    
    const projectRoot = process.cwd();
    const configPaths = [
      path.join(projectRoot, 'enfyra.config.ts'),
      path.join(projectRoot, 'enfyra.config.js'),
      path.join(projectRoot, 'enfyra.config.mjs'),
      path.join(projectRoot, 'enfyra.config.cjs'),
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          delete require.cache[require.resolve(configPath)];
          const configModule = require(configPath);
          const config = configModule.default || configModule;
          if (config && typeof config === 'object' && 'apiUrl' in config) {
            cachedConfig = config as EnfyraConfig;
            return cachedConfig;
          }
        } catch (error) {
          console.warn(`[Enfyra SDK] Failed to load config from ${configPath}:`, error);
        }
      }
    }
  } catch (error) {
    // fs not available (client-side)
    return null;
  }

  return null;
}

export function getEnfyraConfigFromFile(): EnfyraConfig | null {
  return loadEnfyraConfig();
}

