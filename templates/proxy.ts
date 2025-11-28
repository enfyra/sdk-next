import { NextRequest, NextResponse } from 'next/server';
import { createEnfyraProxy } from '@enfyra/sdk-next/proxy';
import { getEnfyraSDKConfig } from '@enfyra/sdk-next/constants/config';

// Get config from plugin (injected via env variables)
const enfyraConfig = getEnfyraSDKConfig();

// Create proxy with config
const enfyraProxy = createEnfyraProxy(enfyraConfig);

// Wrapper proxy function - add your custom routes/logic here
export async function proxy(request: NextRequest) {
  // Example: Handle custom routes before Enfyra SDK
  // if (request.nextUrl.pathname.startsWith('/api/custom')) {
  //   return NextResponse.json({ message: 'Custom route!' });
  // }

  // Let Enfyra SDK handle its routes (/enfyra/api/** and /assets/**)
  return enfyraProxy(request);
}

// Proxy config - includes SDK routes + your custom routes
// Note: matcher must be a static array (cannot use spread operator or variables)
export const config = {
  matcher: [
    '/enfyra/api/:path*',
    '/assets/:path*',
  ],
};

