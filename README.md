# @enfyra/sdk-next

Enfyra SDK for Next.js App Router. One-line config preset, providerless client hooks, request-scoped server client.

## Quick Start

```bash
yarn add @enfyra/sdk-next
```

Set your Enfyra URL:

```dotenv
ENFYRA_APP_URL=http://localhost:3000
```

Replace your `next.config.mjs` with:

```js
export { default } from '@enfyra/sdk-next'
```

That's it. No CLI, no generated routes, no middleware, no Provider.

## Configured Preset

If you prefer config over env:

```ts
import enfyra from '@enfyra/sdk-next'

export default enfyra({
  appUrl: 'http://localhost:3000',
  routePrefix: '/api/enfyra',
})
```

## Existing Config

Wrap your current config:

```ts
import { withEnfyra } from '@enfyra/sdk-next'

export default withEnfyra(nextConfig, {
  routePrefix: '/api/enfyra',
})
```

Works with object, sync function, and async function configs. Your existing rewrites, basePath, redirects and headers are preserved.

## Client Hooks

```ts
'use client'

import { useAuth, useEnfyra, useQuery, useMutation, useStorage } from '@enfyra/sdk-next/client'

function Profile() {
  const { user, isAuthenticated, pending, login, logout } = useAuth()
  const client = useEnfyra()
}
```

No Provider needed. Hooks are SSR-safe — server render is always anonymous/idle, auth refresh starts after hydration.

## Server Components

```ts
import { createServerEnfyra } from '@enfyra/sdk-next/server'

export default async function Page() {
  const client = await createServerEnfyra()
  const result = await client.from('posts').execute()
}
```

Creates a fresh request-scoped client per call, forwarding the current request's cookies.

## Server Actions

```ts
'use server'

import { createServerActionEnfyra } from '@enfyra/sdk-next/server'

export async function loginAction(formData: FormData) {
  const { client, applySetCookies } = await createServerActionEnfyra()
  const response = await client.post('/auth/login', {
    email: formData.get('email'),
    password: formData.get('password'),
  })
  applySetCookies(response.headers['set-cookie'] ?? [])
}
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `appUrl` | `ENFYRA_APP_URL` env | Enfyra server origin URL |
| `routePrefix` | `/api/enfyra` | Browser-facing proxy prefix |
| `realtime` | `false` | Add Socket.IO rewrite rule |

## Requirements

- Next.js `>=14 <17` (App Router only)
- React `>=18 <20`
- Node.js `>=18.18`

## License

MIT
