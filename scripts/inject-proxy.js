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

function injectEnfyraProxy(proxyPath) {
  if (!fs.existsSync(proxyPath)) {
    const enfyraImport = `import { NextRequest, NextResponse } from 'next/server';\nimport { createEnfyraProxy } from '@enfyra/sdk-next/proxy';\nimport { getEnfyraSDKConfig } from '@enfyra/sdk-next/constants/config';\n\n`;
    const enfyraInit = `const enfyraConfig = getEnfyraSDKConfig();\nconst enfyraProxy = createEnfyraProxy(enfyraConfig);\n\n`;
    const proxyFunction = `export async function proxy(request: NextRequest) {\n  return enfyraProxy(request);\n}\n\n`;
    const config = `export const config = {\n  matcher: [\n    '/enfyra/api/:path*',\n    '/assets/:path*',\n  ],\n};\n`;
    
    const content = enfyraImport + enfyraInit + proxyFunction + config;
    fs.writeFileSync(proxyPath, content, 'utf8');
    console.log('[Enfyra SDK] Created proxy.ts');
    return;
  }

  let content = fs.readFileSync(proxyPath, 'utf8');
  
  if (content.includes('@enfyra/sdk-next/proxy') && content.includes('enfyraProxy')) {
    console.log('[Enfyra SDK] proxy.ts already has Enfyra SDK integration');
    return;
  }

  const enfyraImport = `import { createEnfyraProxy } from '@enfyra/sdk-next/proxy';\nimport { getEnfyraSDKConfig } from '@enfyra/sdk-next/constants/config';\n`;
  const enfyraInit = `\nconst enfyraConfig = getEnfyraSDKConfig();\nconst enfyraProxy = createEnfyraProxy(enfyraConfig);\n`;

  if (!content.includes('@enfyra/sdk-next')) {
    const lastImportIndex = content.lastIndexOf('import');
    if (lastImportIndex !== -1) {
      const nextLineIndex = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, nextLineIndex + 1) + enfyraImport + content.slice(nextLineIndex + 1);
    } else {
      content = enfyraImport + content;
    }
  }

  if (!content.includes('enfyraConfig')) {
    const lastImportIndex = content.lastIndexOf('import');
    if (lastImportIndex !== -1) {
      const nextLineIndex = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, nextLineIndex + 1) + enfyraInit + content.slice(nextLineIndex + 1);
    } else {
      content = enfyraInit + content;
    }
  }

  const proxyFunctionMatch = content.match(/export\s+(async\s+)?function\s+proxy\s*\([^)]*\)\s*\{/);
  if (proxyFunctionMatch) {
    const openBraceIndex = content.indexOf('{', proxyFunctionMatch.index);
    const functionBodyStart = openBraceIndex + 1;
    
    if (!content.slice(functionBodyStart, functionBodyStart + 200).includes('enfyraProxy')) {
      const afterBrace = content.slice(functionBodyStart);
      const indentMatch = afterBrace.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '  ';
      
      const proxyCall = `${indent}const enfyraResponse = await enfyraProxy(request);\n${indent}if (enfyraResponse) return enfyraResponse;\n\n`;
      
      content = content.slice(0, functionBodyStart) + proxyCall + afterBrace;
      fs.writeFileSync(proxyPath, content, 'utf8');
      console.log('[Enfyra SDK] Injected Enfyra SDK into existing proxy.ts');
    }
  } else {
    if (!content.includes('export async function proxy')) {
      const NextResponseImport = content.includes('NextResponse') ? '' : `import { NextResponse } from 'next/server';\n`;
      content = enfyraImport + NextResponseImport + enfyraInit + `\nexport async function proxy(request) {\n  const enfyraResponse = await enfyraProxy(request);\n  if (enfyraResponse) return enfyraResponse;\n  return new NextResponse();\n}\n` + content;
      fs.writeFileSync(proxyPath, content, 'utf8');
      console.log('[Enfyra SDK] Added proxy function with Enfyra SDK integration');
    }
  }
}

const projectRoot = findProjectRoot();
const proxyPath = path.join(projectRoot, 'proxy.ts');

injectEnfyraProxy(proxyPath);

