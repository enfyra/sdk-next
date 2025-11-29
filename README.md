# @enfyra/sdk-next

Next.js SDK for **_Enfyra CMS_** - _A powerful React hooks-based API client with full SSR support and TypeScript integration._

## Installation

```bash
npm install @enfyra/sdk-next
```

The package will automatically scaffold **proxy + auth API routes** into your Next.js app (following the renamed `proxy.ts` convention in Next.js 16).

**Files that will be created:**

- `app/enfyra/api/login/route.ts` - Always overwritten on install/build/dev
- `app/enfyra/api/logout/route.ts` - Always overwritten on install/build/dev
- `proxy.ts` - Only copied if it doesn't exist (to preserve your custom configuration)

The login/logout route files simply re-export the SDK's built-in handlers and cannot be customized. The `proxy.ts` file can be customized to add your own proxy logic.

**Important:**

- **API routes** (`app/enfyra/api/*`) are always overwritten and cannot be customized - they are managed by the SDK
- **`proxy.ts`** is only copied when it doesn't exist, so your custom proxy configuration is preserved
- If you delete API routes by mistake, reinstalling the SDK or running dev/build will re-copy them
- For Next.js ≥16, use `proxy.ts` instead of `middleware.ts` to avoid the deprecated file warning[^next-proxy]

## Setup

### 1. Configure Next.js

Add the plugin to your Next.js configuration file. The plugin accepts your existing Next.js config and Enfyra SDK options.

```typescript
// next.config.ts
import type { NextConfig } from "next";
import { withEnfyra } from "@enfyra/sdk-next/plugin";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // ... your other Next.js config options
};

export default withEnfyra(nextConfig, {
  enfyraSDK: {
    apiUrl: process.env.ENFYRA_API_URL!,
    apiPrefix: "/enfyra/api", // Optional, defaults to '/enfyra/api'
  },
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

Use **`fetchEnfyraApi`** hook **_for optimal performance in Server Components_**.
It returns `{ data, error }` instead of throwing errors.

```typescript
// app/user_definition/page.tsx
import { fetchEnfyraApi, type ApiError } from "@enfyra/sdk-next";

export default async function UsersPage() {
  const { data: users, error }: { data: any[] | null; error: ApiError | null } =
    await fetchEnfyraApi("/user_definition");

  if (error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users?.map((user: any) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**With Query Parameters:**

```typescript
// app/user_definition/page.tsx
import { fetchEnfyraApi, type ApiError } from "@enfyra/sdk-next";

export default async function UsersPage() {
  // Method 1: Query in path
  const { data: users, error } = await fetchEnfyraApi(
    "/user_definition?fields=id,name,email"
  );

  // Method 2: Query in options
  const { data: filteredUsers, error: filterError } = await fetchEnfyraApi(
    "/user_definition",
    {
      query: {
        fields: "id,name,email",
        status: "active",
        limit: 10,
      },
    }
  );

  if (error || filterError) {
    return <div>Error loading users</div>;
  }

  return (
    <div>
      <h1>Users</h1>
      {/* Render users */}
    </div>
  );
}
```

**With Custom Headers and Error Handling:**

```typescript
import { fetchEnfyraApi, type ApiError } from "@enfyra/sdk-next";

export default async function CustomHeadersPage() {
  const { data, error }: { data: any | null; error: ApiError | null } =
    await fetchEnfyraApi("/data", {
      headers: {
        "X-Custom-Header": "value",
      },
      errorContext: "Custom Headers Page",
    });

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <div>{/* Render data */}</div>;
}
```

### `fetchEnfyraApi<T>(path, options?)`

**Parameters:**

- `path` (string): API endpoint path
- `options` (FetchEnfyraApiOptions):
  - `method`?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  - `body`?: any
  - `headers`?: Record<string, string>
  - `query`?: Record<string, any>
  - `errorContext`?: string - Context for error messages
  - `onError`?: (error: ApiError, context?: string) => void - Custom error handler

**Returns:** `Promise<{ data: T | null; error: ApiError | null }>`

The function returns an object with `data` and `error` properties, allowing you to handle errors gracefully without try/catch blocks.

#

### Client Components

Use the **`useEnfyraApi`** hook **_for client-side data fetching and mutations_**:

```typescript
"use client";
import { useEnfyraApi } from "@enfyra/sdk-next";
import { useState } from "react";

export function UsersList() {
  const { data, error, pending, execute } = useEnfyraApi("/user_definition");

  if (pending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <ul>
      {data.map((user: any) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

**Creating Resources (POST):**

```typescript
"use client";
import { useEnfyraApi } from "@enfyra/sdk-next";
import { useState } from "react";

export function CreateUserForm() {
  const { execute, pending, error, data } = useEnfyraApi("/user_definition", {
    method: "post",
    errorContext: "Create User",
  });
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setSuccess(false);
    const result = await execute({
      body: Object.fromEntries(formData),
    });

    if (error) {
      console.error("Failed to create user:", error.message);
      return;
    }

    if (result) {
      setSuccess(true);
      console.log("User created successfully:", result);
    }
  };

  return (
    <form action={handleSubmit}>
      {error && <div className="error">Error: {error.message}</div>}
      {success && <div className="success">User created successfully!</div>}
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}
```

**Updating Resources (PUT/PATCH):**

```typescript
"use client";
import { useEnfyraApi } from "@enfyra/sdk-next";

export function UpdateUserForm({ userId }: { userId: string }) {
  const { execute, pending, error } = useEnfyraApi("/user_definition", {
    method: "patch",
    errorContext: "Update User",
  });

  const handleUpdate = async (formData: FormData) => {
    await execute({
      id: userId,
      body: Object.fromEntries(formData),
    });
  };

  return (
    <form action={handleUpdate}>
      {/* Form fields */}
      <button type="submit" disabled={pending}>
        {pending ? "Updating..." : "Update"}
      </button>
    </form>
  );
}
```

**Deleting Resources (DELETE):**

```typescript
"use client";
import { useEnfyraApi } from "@enfyra/sdk-next";

export function DeleteUserButton({ userId }: { userId: string }) {
  const { execute, pending, error } = useEnfyraApi("/user_definition", {
    method: "delete",
    errorContext: "Delete User",
  });

  const handleDelete = async () => {
    if (!confirm("Are you sure?")) return;

    await execute({ id: userId });
    // Handle success (e.g., redirect or refresh)
  };

  return (
    <button onClick={handleDelete} disabled={pending}>
      {pending ? "Deleting..." : "Delete"}
    </button>
  );
}
```

**Query Parameters:**

```typescript
"use client";
import { useEnfyraApi } from "@enfyra/sdk-next";

export function FilteredUsers() {
  const [status, setStatus] = useState("active");

  const { data, error, pending, execute } = useEnfyraApi("/user_definition", {
    query: {
      fields: "id,name,email",
      status: status,
      limit: 20,
    },
  });

  return (
    <div>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      {/* Render users */}
    </div>
  );
}
```

**Dynamic Path:**

```typescript
"use client";
import { useEnfyraApi } from "@enfyra/sdk-next";

export function UserDetails({ userId }: { userId: string }) {
  const { data, error, pending } = useEnfyraApi(
    () => `/user_definition/${userId}`,
    {
      query: {
        fields: "id,name,email,role.*",
      },
    }
  );

  if (pending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* Render user details */}</div>;
}
```

### Batch Operations

**Batch Update/Delete with Progress:**

```typescript
"use client";
import { useEnfyraApi } from "@enfyra/sdk-next";
import { useState } from "react";

export function BulkDeleteUsers() {
  const { execute, pending } = useEnfyraApi("/user_definition", {
    method: "delete",
    batchSize: 10,
    concurrent: 5,
    onProgress: (progress) => {
      console.log(`Progress: ${progress.progress}%`);
      console.log(`Completed: ${progress.completed}/${progress.total}`);
      console.log(`Failed: ${progress.failed}`);
      console.log(`Speed: ${progress.operationsPerSecond} ops/s`);
    },
  });

  const handleBulkDelete = async (userIds: string[]) => {
    await execute({ ids: userIds });
  };

  return (
    <button
      onClick={() => handleBulkDelete(["1", "2", "3"])}
      disabled={pending}
    >
      {pending ? "Deleting..." : "Delete Selected"}
    </button>
  );
}
```

**Batch File Upload:**

```typescript
"use client";
import { useEnfyraApi } from "@enfyra/sdk-next";
import { useState } from "react";

export function BatchUploadForm() {
  const { execute, pending } = useEnfyraApi("/files", {
    method: "post",
    batchSize: 5,
    concurrent: 3,
    onProgress: (progress) => {
      console.log(`Uploaded: ${progress.completed}/${progress.total}`);
    },
  });

  const handleBatchUpload = async (files: FileList) => {
    const formDataArray = Array.from(files).map((file) => {
      const formData = new FormData();
      formData.append("file", file);
      return formData;
    });

    await execute({ files: formDataArray });
  };

  return (
    <input
      type="file"
      multiple
      onChange={(e) => {
        if (e.target.files) {
          handleBatchUpload(e.target.files);
        }
      }}
      disabled={pending}
    />
  );
}
```

### Error Handling

**Custom Error Handler:**

```typescript
"use client";
import { useEnfyraApi } from "@enfyra/sdk-next";
import type { ApiError } from "@enfyra/sdk-next";

export function UserListWithErrorHandling() {
  const { data, error, pending, execute } = useEnfyraApi("/user_definition", {
    errorContext: "Fetch Users",
    onError: (error: ApiError, context?: string) => {
      console.error(`[${context}]`, error);
      // Custom error handling logic
      if (error.status === 401) {
        // Redirect to login
        window.location.href = "/login";
      }
    },
  });

  if (error) {
    return (
      <div>
        <h2>Error {error.status}</h2>
        <p>{error.message}</p>
        <button onClick={() => execute()}>Retry</button>
      </div>
    );
  }

  return <div>{/* Render users */}</div>;
}
```

#### `useEnfyraApi<T>(path, options?)`

##### **Parameters:**

- `path` (string | function): API endpoint path. Can be a function that returns a path for dynamic routes.
- `options` (ApiOptions): Configuration options
  - `method`?: 'get' | 'post' | 'put' | 'patch' | 'delete'
  - `body`?: any - Request body
  - `query`?: Record<string, any> - Query parameters
  - `headers`?: Record<string, string> - Custom headers
  - `errorContext`?: string - Context for error messages
  - `onError`?: (error: ApiError, context?: string) => void - Custom error handler
  - `disableBatch`?: boolean - Disable batch operations
  - `batchSize`?: number - Batch size for operations (PATCH/DELETE/POST only)
  - `concurrent`?: number - Max concurrent requests (PATCH/DELETE/POST only)
  - `onProgress`?: (progress: BatchProgress) => void - Progress callback (PATCH/DELETE/POST only)

##### **Returns:**

- `data`: T | null - Response data
- `error`: ApiError | null - Error object
- `pending`: boolean - Loading state
- `execute`: (options?: ExecuteOptions) => Promise<T | T[] | null> - Execute function

##### **ExecuteOptions:**

- `body`?: any - Override request body
- `id`?: string | number - Resource ID for single operations
- `ids`?: (string | number)[] - Resource IDs for batch operations
- `files`?: FormData[] - FormData array for batch uploads
- `query`?: Record<string, any> - Additional query parameters
- `batchSize`?: number - Override batch size
- `concurrent`?: number - Override concurrent limit
- `onProgress`?: (progress: BatchProgress) => void - Override progress callback

#

### Authentication

The `useEnfyraAuth` hook provides authentication functionality (managing user sessions):

```typescript
"use client";
import { useEnfyraAuth } from "@enfyra/sdk-next";
import { useState } from "react";

export function AuthButton() {
  const { me, login, logout, isLoggedIn, isLoading, fetchUser } =
    useEnfyraAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const result = await login({ email, password });
    if (result) {
      console.log("Login successful");
    } else {
      console.error("Login failed");
    }
  };

  const handleFetchUser = async () => {
    await fetchUser({ fields: ["id", "email", "role.*"] });
  };

  if (isLoggedIn) {
    return (
      <div>
        <p>Welcome, {me?.email}</p>
        <button onClick={handleFetchUser} disabled={isLoading}>
          Refresh User Info
        </button>
        <button onClick={logout} disabled={isLoading}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button onClick={handleLogin} disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}
```

**Fetch User with Fields:**

```typescript
"use client";
import { useEnfyraAuth } from "@enfyra/sdk-next";
import { useEffect } from "react";

export function UserProfile() {
  const { me, fetchUser, isLoading } = useEnfyraAuth();

  useEffect(() => {
    fetchUser({
      fields: ["id", "email", "name", "role.*"],
    });
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (!me) return <div>Not logged in</div>;

  return (
    <div>
      <h1>{me.name}</h1>
      <p>{me.email}</p>
      {me.role && <p>Role: {me.role.name}</p>}
    </div>
  );
}
```

#### `useEnfyraAuth()`

**Returns:**

- `me`: User | null - Current user object
- `login`: (payload: LoginPayload) => Promise<any> - Login function
- `logout`: () => Promise<void> - Logout function
- `fetchUser`: (options?: { fields?: string[] }) => Promise<void> - Fetch current user
- `isLoggedIn`: boolean - Login status
- `isLoading`: boolean - Loading state

#

## Features

✅ **SSR & Client-Side Support** - Server Components and React hooks  
✅ **Authentication Integration** - Built-in auth hooks with automatic token management  
✅ **Asset Proxy** - Automatic `/assets/**` proxy to backend  
✅ **TypeScript Support** - Full type safety  
✅ **Batch Operations** - Efficient bulk operations with progress tracking  
✅ **File Uploads** - Support for single and batch file uploads  
✅ **Error Handling** - Automatic error management with custom handlers  
✅ **Reactive State** - Built-in loading, error, and data states  
✅ **Query Parameters** - Flexible query parameter handling  
✅ **Zero Config** - Files automatically copied during installation

## How It Works

1. **Installation / Scaffolding**: The package automatically copies proxy and auth API routes:
   - `app/enfyra/api/login/route.ts` - Always overwritten (managed by SDK, cannot be customized)
   - `app/enfyra/api/logout/route.ts` - Always overwritten (managed by SDK, cannot be customized)
   - `proxy.ts` - Only copied if it doesn't exist (can be customized)
2. **Proxy**: Handles all `/enfyra/api/**` and `/assets/**` requests, forwards to Enfyra backend. You can customize `proxy.ts` by adding your own routes before calling `enfyraProxy()`.
3. **Token Management**: Automatically validates and refreshes access tokens
4. **API Routes**: Login/logout routes handle authentication cookies (managed by SDK)

## Customization

### Customizing Next.js Config with Enfyra Config

The `withEnfyra` plugin merges your existing Next.js configuration with Enfyra SDK configuration. You can pass any Next.js config options alongside the Enfyra config:

```typescript
// next.config.ts
import type { NextConfig } from "next";
import { withEnfyra } from "@enfyra/sdk-next/plugin";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["example.com"],
  },
  async rewrites() {
    return [
      {
        source: "/custom-api/:path*",
        destination: "/api/:path*",
      },
    ];
  },
};

export default withEnfyra(nextConfig, {
  enfyraSDK: {
    apiUrl: process.env.ENFYRA_API_URL!,
    apiPrefix: "/enfyra/api",
  },
});
```

The plugin will:

- Merge your Next.js config with Enfyra config
- Inject Enfyra environment variables (`ENFYRA_API_URL`, `ENFYRA_API_PREFIX`, etc.) into your Next.js config
- Preserve all your existing Next.js configuration options

### Customizing Proxy/Middleware

You can customize the proxy behavior by editing the `proxy.ts` file. **Note:** Once `proxy.ts` exists, the SDK will not overwrite it, so your customizations are preserved. The proxy acts as a wrapper around Enfyra's proxy handler, allowing you to add custom logic before or after Enfyra routes are processed.

#### Basic Custom Proxy

```typescript
// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { enfyraProxy } from "@enfyra/sdk-next/proxy";

export async function proxy(request: NextRequest) {
  return enfyraProxy(request);
}

export const config = {
  matcher: ["/enfyra/api/:path*", "/assets/:path*"],
};
```

#### Custom Proxy with Route Handling

Handle custom routes before passing to Enfyra SDK:

```typescript
// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { enfyraProxy } from "@enfyra/sdk-next/proxy";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/custom")) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Custom route handled" });
  }

  return enfyraProxy(request);
}

export const config = {
  matcher: ["/enfyra/api/:path*", "/assets/:path*", "/api/custom/:path*"],
};
```

**Important Notes:**

- Next.js requires `config.matcher` to be a static array - you cannot use spread operators or variables
- You must list all matcher patterns directly in the array
- The proxy function should always call `enfyraProxy()` for Enfyra routes to work correctly
- Custom routes should be handled before calling `enfyraProxy()`

## License

MIT

[^next-proxy]: Next.js 16 renamed `middleware.ts` → `proxy.ts`. See the official announcement: [Renaming Middleware to Proxy](https://nextjs.org/docs/messages/middleware-to-proxy).
