import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface EnfyraConfig {
  apiUrl: string;
  apiPrefix?: string;
}

function ensureTemplatesCopied() {
  try {
    const projectRoot = process.cwd();
    const appDir = join(projectRoot, 'app');

    if (existsSync(appDir)) {
      try {
        let copyScript: string | null = null;
        
        try {
          const sdkPath = require.resolve('@enfyra/sdk-next/package.json');
          copyScript = join(sdkPath, '..', 'scripts', 'copy-templates.js');
        } catch (e) {
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

if (typeof window === 'undefined') {
  ensureTemplatesCopied();
}
