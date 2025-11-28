# @enfyra/sdk-next

Next.js SDK for Enfyra CMS - A powerful React hooks-based API client with full SSR support and TypeScript integration.

## Installation

```bash
npm install @enfyra/sdk-next
```

The package will automatically scaffold **proxy + auth API routes** into your Next.js app (following the renamed `proxy.ts` convention in Next.js 16).  

**Files that will be created (if they don't exist):**

- `app/enfyra/api/login/route.ts`
- `app/enfyra/api/logout/route.ts`
- `proxy.ts` (replaces the legacy `middleware.ts`)

Each of these files simply re-export the SDK’s built-in handlers, so your app stays clean while still allowing overrides when needed.

If you need to override (for example, customize the login route), just edit the generated files directly. If you delete them by mistake, reinstalling the SDK or running dev/build will re-copy everything. For Next.js ≥16, use `proxy.ts` instead of `middleware.ts` to avoid the deprecated file warning.[^next-proxy]

## Setup

### 1. Configure Next.js

Add the plugin to your Next.js configuration file. The plugin accepts your existing Next.js config and Enfyra SDK options.

#### CommonJS (`next.config.js`)

```javascript
const { withEnfyra } = require('@enfyra/sdk-next/plugin');

module.exports = withEnfyra(
  {
    // Your existing Next.js config options
    reactStrictMode: true,
    // ... other config
  },
  {
    enfyraSDK: {
      apiUrl: process.env.ENFYRA_API_URL || 'http://localhost:1105',
      apiPrefix: '/enfyra/api', // Optional, defaults to '/enfyra/api'
    }
  }
);
```

#### ES Modules (`next.config.mjs`)

```javascript
import { withEnfyra } from '@enfyra/sdk-next/plugin';

export default withEnfyra(
  {
    // Your existing Next.js config options
    reactStrictMode: true,
    // ... other config
  },
  {
    enfyraSDK: {
      apiUrl: process.env.ENFYRA_API_URL || 'https://api.enfyra.com',
      apiPrefix: '/enfyra/api', // Optional
    }
  }
);
```

#### TypeScript (`next.config.ts`)

```typescript
import type { NextConfig } from 'next';
import { withEnfyra } from '@enfyra/sdk-next/plugin';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // ... other config
};

export default withEnfyra(nextConfig, {
  enfyraSDK: {
    apiUrl: process.env.ENFYRA_API_URL!,
    apiPrefix: '/enfyra/api', // Optional
  }
});
```

**Configuration Options:**
- `apiUrl` (required): The base URL of your Enfyra API backend
- `apiPrefix` (optional): The API prefix for Enfyra routes. Defaults to `/enfyra/api`

### 2. Environment Variables

Create a `.env.local` file in your project root:

```bash
# .env.local
ENFYRA_API_URL=https://api.enfyra.com
# or for local development
ENFYRA_API_URL=http://localhost:1105
```

## Usage

### Server Components (SSR)

```typescript
// app/users/page.tsx
import { fetchEnfyraApi } from '@enfyra/sdk-next';

export default async function UsersPage() {
  const users = await fetchEnfyraApi('/users');
  
  return (
    <div>
      <h1>Users</h1>
      {/* Render users */}
    </div>
  );
}
```

### Client Components

```typescript
'use client';
import { useEnfyraApi } from '@enfyra/sdk-next';

export function CreateUserForm() {
  const { execute, pending, error } = useEnfyraApi('/users', {
    method: 'post',
    errorContext: 'Create User'
  });

  const handleSubmit = async (formData: FormData) => {
    await execute({ body: Object.fromEntries(formData) });
    // Handle success/error
  };

  return (
    <form action={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Authentication

```typescript
'use client';
import { useEnfyraAuth } from '@enfyra/sdk-next';

export function AuthButton() {
  const { me, login, logout, isLoggedIn } = useEnfyraAuth();

  if (isLoggedIn) {
    return <button onClick={logout}>Logout</button>;
  }

  return <button onClick={() => login({ email, password })}>Login</button>;
}
```

## Features

✅ **SSR & Client-Side Support** - Server Components and React hooks  
✅ **Authentication Integration** - Built-in auth hooks with automatic token management  
✅ **Asset Proxy** - Automatic `/assets/**` proxy to backend  
✅ **TypeScript Support** - Full type safety  
✅ **Batch Operations** - Efficient bulk operations with progress tracking  
✅ **Error Handling** - Automatic error management  
✅ **Reactive State** - Built-in loading, error, and data states  
✅ **Zero Config** - Files automatically copied during installation  

## How It Works

1. **Installation / Scaffolding**: The package automatically copies proxy and auth API routes into your `app/` directory:
   - `app/enfyra/api/login/route.ts`
   - `app/enfyra/api/logout/route.ts`
   - `proxy.ts`
2. **Proxy**: Handles all `/enfyra/api/**` and `/assets/**` requests, forwards to Enfyra backend (can be customized if needed)
3. **Token Management**: Automatically validates and refreshes access tokens
4. **API Routes**: Login/logout routes handle authentication cookies

## Customization

### Customizing Proxy Matcher Patterns

By default, the proxy matches `/enfyra/api/**` and `/assets/**` routes. You can customize the matcher patterns in two ways:

You can customize the matcher patterns by editing the `proxy.ts` file directly:

```typescript
// proxy.ts
import { NextRequest, NextResponse } from 'next/server';
import { enfyraProxy } from '@enfyra/sdk-next/proxy';

export async function proxy(request: NextRequest) {
  // Add your custom logic here if needed
  return enfyraProxy(request);
}

// Add your custom routes to matcher
export const config = {
  matcher: [
    '/enfyra/api/:path*', // SDK route
    '/assets/:path*', // SDK route
    '/api/custom/:path*', // Your custom route
  ],
};
```

**Note:** Next.js requires `config.matcher` to be a static array - you cannot use spread operators or variables. You must list all matcher patterns directly.

### Customizing API Routes

You can also customize the login/logout routes by editing the generated route files:

```typescript
// app/enfyra/api/login/route.ts
export { POST } from '@enfyra/sdk-next/routes/login';

// Or implement your own:
// export async function POST(request: NextRequest) {
//   // Your custom implementation
// }
```

## License

MIT

[^next-proxy]: Next.js 16 renamed `middleware.ts` → `proxy.ts`. See the official announcement: [Renaming Middleware to Proxy](https://nextjs.org/docs/messages/middleware-to-proxy).
