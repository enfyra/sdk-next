const fs = require('fs');
const path = require('path');

function findProjectRoot() {
  try {
    const sdkPath = require.resolve('@enfyra/sdk-next/package.json');
    const sdkDir = path.dirname(sdkPath);
    
    if (sdkDir.includes('node_modules')) {
      const nodeModulesIndex = sdkDir.indexOf('node_modules');
      const projectRoot = sdkDir.substring(0, nodeModulesIndex - 1);
      if (fs.existsSync(path.join(projectRoot, 'package.json'))) {
        return projectRoot;
      }
    }
  } catch (e) {
  }
  
  let currentDir = path.resolve(__dirname, '..');
  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.name !== '@enfyra/sdk-next') {
          return currentDir;
        }
      } catch (e) {
      }
    }
    currentDir = path.dirname(currentDir);
  }
  
  return process.cwd();
}

const templatesDir = path.join(__dirname, '..', 'templates');
const projectRoot = findProjectRoot();

if (process.env.DEBUG) {
  console.log('[Enfyra SDK] Project root:', projectRoot);
}

const appDir = path.join(projectRoot, 'app');

if (!fs.existsSync(appDir)) {
  console.warn('[Enfyra SDK] app/ directory not found. Skipping template copy.');
  console.warn('[Enfyra SDK] Make sure you are using Next.js App Router (app/ directory).');
  process.exit(0);
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`[Enfyra SDK] Copied ${path.relative(projectRoot, destPath)} (overwritten)`);
    }
  }
}


try {
  const injectScript = path.join(__dirname, 'inject-proxy.js');
  if (fs.existsSync(injectScript)) {
    require(injectScript);
  }
} catch (e) {
  console.warn('[Enfyra SDK] Failed to inject proxy:', e?.message || e);
}

const configTemplate = path.join(templatesDir, 'enfyra.config.ts');
const configDest = path.join(projectRoot, 'enfyra.config.ts');

if (fs.existsSync(configTemplate)) {
  if (!fs.existsSync(configDest)) {
    fs.copyFileSync(configTemplate, configDest);
    console.log('[Enfyra SDK] Copied enfyra.config.ts (created)');
  } else {
    console.log('[Enfyra SDK] enfyra.config.ts already exists, skipping copy to preserve custom configuration');
  }
}

console.log('[Enfyra SDK] Template copy completed.');

