const fs = require('fs');
const path = require('path');

// Find the project root (where SDK is installed)
// When postinstall runs, it should run from project root, but we need to be sure
function findProjectRoot() {
  // Method 1: If we can resolve SDK package, find project root from there
  try {
    const sdkPath = require.resolve('@enfyra/sdk-next/package.json');
    const sdkDir = path.dirname(sdkPath);
    
    // If SDK is in node_modules, go up to project root
    if (sdkDir.includes('node_modules')) {
      const nodeModulesIndex = sdkDir.indexOf('node_modules');
      const projectRoot = sdkDir.substring(0, nodeModulesIndex - 1);
      // Verify it's a valid project root (has package.json)
      if (fs.existsSync(path.join(projectRoot, 'package.json'))) {
        return projectRoot;
      }
    }
  } catch (e) {
    // SDK not found via require.resolve
  }
  
  // Method 2: Start from __dirname (scripts/) and go up until we find a package.json
  // that's not the SDK's package.json
  let currentDir = path.resolve(__dirname, '..'); // SDK root
  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        // If this is not the SDK package, it's the project root
        if (packageJson.name !== '@enfyra/sdk-next') {
          return currentDir;
        }
      } catch (e) {
        // Continue searching
      }
    }
    currentDir = path.dirname(currentDir);
  }
  
  // Method 3: Fallback to process.cwd() (should be project root when postinstall runs)
  return process.cwd();
}

const templatesDir = path.join(__dirname, '..', 'templates');
const projectRoot = findProjectRoot();

// Debug: log project root (only in development)
if (process.env.DEBUG) {
  console.log('[Enfyra SDK] Project root:', projectRoot);
}

const appDir = path.join(projectRoot, 'app');

// Check if app directory exists (Next.js App Router)
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
      // Always copy (overwrite) to ensure latest template
      fs.copyFileSync(srcPath, destPath);
      console.log(`[Enfyra SDK] Copied ${path.relative(projectRoot, destPath)} (overwritten)`);
    }
  }
}

// Copy API routes
// New structure: templates/app/enfyra/api -> app/enfyra/api
// This matches ENFYRA_API_PREFIX = '/enfyra/api'
const apiTemplatesDirNew = path.join(templatesDir, 'app', 'enfyra', 'api');
const apiDestDir = path.join(appDir, 'enfyra', 'api');

if (fs.existsSync(apiTemplatesDirNew)) {
  copyDirectory(apiTemplatesDirNew, apiDestDir);
} else {
  // Fallback for older template structure: templates/app/api/enfyra
  const apiTemplatesDirLegacy = path.join(templatesDir, 'app', 'api', 'enfyra');
  if (fs.existsSync(apiTemplatesDirLegacy)) {
    copyDirectory(apiTemplatesDirLegacy, apiDestDir);
  }
}

// Copy proxy (formerly middleware)
const proxyTemplate = path.join(templatesDir, 'proxy.ts');
const proxyDest = path.join(projectRoot, 'proxy.ts');

if (fs.existsSync(proxyTemplate)) {
  fs.copyFileSync(proxyTemplate, proxyDest);
  console.log(`[Enfyra SDK] Copied proxy.ts (overwritten)`);
}

console.log('[Enfyra SDK] Template copy completed.');

