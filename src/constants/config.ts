export const ENFYRA_API_PREFIX = "/enfyra/api";

export interface EnfyraSDKConfig {
  apiUrl: string;
  apiPrefix?: string;
}

let cachedFileConfig: { apiUrl: string; apiPrefix?: string } | null = null;

function loadConfigFromFile(): { apiUrl: string; apiPrefix?: string } | null {
  if (typeof window !== 'undefined') return null;
  if (cachedFileConfig) return cachedFileConfig;

  try {
    const loadFs = new Function('return require("fs")');
    const loadPath = new Function('return require("path")');
    const fs = loadFs();
    const path = loadPath();
    
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
            cachedFileConfig = {
              apiUrl: config.apiUrl,
              apiPrefix: config.apiPrefix,
            };
            return cachedFileConfig;
          }
        } catch (error) {
          console.warn(`[Enfyra SDK] Failed to load config from ${configPath}:`, error);
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function getEnfyraSDKConfig(): EnfyraSDKConfig {
  const fileConfig = loadConfigFromFile();
  
  if (fileConfig) {
    return {
      apiUrl: fileConfig.apiUrl,
      apiPrefix: fileConfig.apiPrefix || ENFYRA_API_PREFIX,
    };
  }

  return {
    apiUrl: '',
    apiPrefix: ENFYRA_API_PREFIX,
  };
}

export function getEnfyraSDKConfigClient(): Pick<EnfyraSDKConfig, 'apiPrefix'> {
  return {
    apiPrefix: ENFYRA_API_PREFIX,
  };
}

