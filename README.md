# @enfyra/sdk-next

Next.js SDK for **_Enfyra CMS_** - _A powerful React hooks-based API client with full SSR support and TypeScript integration._

## Installation

```bash
npm install @enfyra/sdk-next
```

The package will automatically set up **proxy + config file** into your Next.js app (following the renamed `proxy.ts` convention in Next.js 16).

**Files that will be created:**

- `proxy.ts` - Automatically created or injected with Enfyra SDK integration (preserves your existing code)
- `enfyra.config.ts` - Only copied if it doesn't exist (to preserve your custom configuration)

**Important:**

- **`proxy.ts`** - If the file doesn't exist, the SDK creates it with Enfyra integration. If it already exists, the SDK injects Enfyra handling at the beginning of your `proxy()` function, preserving all your custom code.
- **`enfyra.config.ts`** - Only copied when it doesn't exist, so your custom configurations are preserved
- **No route files needed** - All API routes (login, logout, etc.) are handled directly in `proxy.ts` for maximum transparency
- **No templates** - The SDK generates code directly, no template files are copied
- For Next.js ≥16, use `proxy.ts` instead of `middleware.ts` to avoid the deprecated file warning[^next-proxy]

## Setup

### 1. Configure Enfyra SDK

The file `enfyra.config.ts` is automatically created in your **project root** (same directory as `package.json` and `next.config.ts`) when you install the package. If it doesn't exist, you can create it manually:

**File location:** `./enfyra.config.ts` (project root)

```typescript
// enfyra.config.ts (in your project root)
import type { EnfyraConfig } from '@enfyra/sdk-next';

const enfyraConfig: EnfyraConfig = {
  apiUrl: process.env.ENFYRA_API_URL || 'http://localhost:1105',
  apiPrefix: '/enfyra/api', // Optional, defaults to '/enfyra/api'
};

export default enfyraConfig;
```

**Configuration Options:**

- `apiUrl` (required): The base URL of your Enfyra API backend
- `apiPrefix` (optional): The API prefix for Enfyra routes. Defaults to `/enfyra/api`

**Note:** The SDK automatically loads this configuration file when imported. You don't need to modify `next.config.ts` at all!

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

Use **`fetchEnfyraApi`** function **_for optimal performance in Server Components_**.
It returns `{ data, error }` instead of throwing errors.

**✅ Automatic Execution**

The `fetchEnfyraApi` function **automatically executes** the request when called. Unlike the client-side hook, you don't need to call any execute function - the request runs immediately when you await the function.

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

**✅ Automatic Execution**

This function **automatically executes** the API request when called. Simply `await` the function and it will immediately make the request. Unlike the client-side `useEnfyraApi` hook, you do not need to call any execute function.

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

The function returns an object with `data` and `error` properties, allowing you to handle errors gracefully without try/catch blocks. The request executes automatically when you await the function.

#

### Client Components

Use the **`useEnfyraApi`** hook **_for client-side data fetching and mutations_**:

**⚠️ Important: Manual Execution Required**

The `useEnfyraApi` hook does **NOT** automatically execute requests. Unlike `fetchEnfyraApi` used in Server Components (which executes automatically), the client hook requires you to **manually call `execute()`** to trigger the API request.

**You must call `execute()` in:**
- `useEffect` hooks (for component mount or dependency changes)
- Event handlers (button clicks, form submissions)
- User interactions (when user triggers an action)
- Any other place where you want to trigger the request

**The hook will NOT execute automatically on mount or when dependencies change.**

```typescript
"use client";
import { useEnfyraApi } from "@enfyra/sdk-next";
import { useEffect } from "react";

export function UsersList() {
  const { data, error, pending, execute } = useEnfyraApi("/user_definition");

  // ⚠️ MUST call execute() manually - the hook does NOT execute automatically
  useEffect(() => {
    execute();
  }, [execute]);

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
import { useState, useEffect } from "react";

export function FilteredUsers() {
  const [status, setStatus] = useState("active");

  const { data, error, pending, execute } = useEnfyraApi("/user_definition", {
    query: {
      fields: "id,name,email",
      status: status,
      limit: 20,
    },
  });

  // ⚠️ MUST call execute() manually when status changes
  useEffect(() => {
    execute();
  }, [status, execute]);

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
import { useEffect } from "react";

export function UserDetails({ userId }: { userId: string }) {
  const { data, error, pending, execute } = useEnfyraApi(
    () => `/user_definition/${userId}`,
    {
      query: {
        fields: "id,name,email,role.*",
      },
    }
  );

  // ⚠️ MUST call execute() manually when userId changes
  useEffect(() => {
    execute();
  }, [userId, execute]);

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

**⚠️ Manual Execution Required**

This hook does **NOT** automatically execute requests. Unlike `fetchEnfyraApi` (used in Server Components) which executes automatically when called, this client hook requires you to **manually call `execute()`** to trigger the API request.

**You must call `execute()` manually in:**
- `useEffect` hooks (for component mount or when dependencies change)
- Button click handlers (for user-triggered actions)
- Form submission handlers (for POST/PUT/PATCH/DELETE operations)
- Event handlers (any user interaction that should trigger a request)
- When you need to refresh or retry data

**The hook will NOT execute automatically on mount, dependency changes, or any other time.**

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
- `execute`: (options?: ExecuteOptions) => Promise<T | T[] | null> - **Execute function (MUST be called manually)**

**State Management:**

Each `useEnfyraApi` hook instance maintains its **own independent state** (`data`, `error`, `pending`). State is **NOT shared** between different hook instances. If you call `useEnfyraApi("/users")` in multiple components, each will have its own separate state.

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

The `useEnfyraAuth` hook provides authentication functionality (managing user sessions).

**✅ Shared Global State**

Unlike `useEnfyraApi` which has independent state per instance, `useEnfyraAuth` uses **shared global state**. All components using `useEnfyraAuth` will share the same authentication state (`me`, `isLoggedIn`). When you call `login()`, `logout()`, or `fetchUser()` in one component, all other components using `useEnfyraAuth` will automatically receive the updated state.

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

**Shared State Example:**

Since `useEnfyraAuth` uses shared global state, multiple components will automatically sync:

```typescript
"use client";
import { useEnfyraAuth } from "@enfyra/sdk-next";

// Component A - Login button
export function LoginButton() {
  const { login, isLoggedIn } = useEnfyraAuth();
  
  const handleLogin = async () => {
    await login({ email: "user@example.com", password: "password" });
    // After login, ALL components using useEnfyraAuth will update automatically
  };
  
  return <button onClick={handleLogin}>Login</button>;
}

// Component B - User info (in a different part of the app)
export function UserInfo() {
  const { me, isLoggedIn } = useEnfyraAuth();
  
  // This component will automatically update when Component A calls login()
  // No need to pass props or use context - state is shared globally
  if (!isLoggedIn) return <div>Please login</div>;
  
  return <div>Welcome, {me?.email}</div>;
}

// Component C - Logout button (somewhere else)
export function LogoutButton() {
  const { logout, isLoggedIn } = useEnfyraAuth();
  
  // When logout() is called, Components A and B will also update automatically
  return isLoggedIn ? <button onClick={logout}>Logout</button> : null;
}
```

#### `useEnfyraAuth()`

**✅ Shared Global State**

All instances of `useEnfyraAuth` share the same global authentication state. When you call `login()`, `logout()`, or `fetchUser()` in one component, all other components using `useEnfyraAuth` will automatically receive the updated state. No need for React Context or prop drilling.

**Returns:**

- `me`: User | null - Current user object (shared across all components)
- `login`: (payload: LoginPayload) => Promise<any> - Login function (updates global state)
- `logout`: () => Promise<void> - Logout function (updates global state)
- `fetchUser`: (options?: { fields?: string[] }) => Promise<void> - Fetch current user (updates global state)
- `isLoggedIn`: boolean - Login status (shared across all components)
- `isLoading`: boolean - Loading state (per component instance)

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
✅ **Zero Config** - Files automatically created/injected during installation
✅ **Non-Intrusive** - Never overwrites your existing code, only injects integration

## How It Works

1. **Installation / Scaffolding**: The package automatically sets up proxy and config:
   - `proxy.ts` - Automatically injected with Enfyra SDK integration (preserves your existing code)
   - `enfyra.config.ts` - Only copied if it doesn't exist (can be customized)
2. **Configuration**: The SDK reads configuration from `enfyra.config.ts` file, keeping it separate from Next.js config
3. **Proxy**: Handles all `/enfyra/api/**` and `/assets/**` requests, including login/logout routes. Enfyra routes are checked first, then your custom routes in `proxy.ts` run.
4. **Token Management**: Automatically validates and refreshes access tokens
5. **Transparent Integration**: No route files needed - everything is handled in `proxy.ts` for maximum transparency

## Customization

### Customizing Enfyra Config

All Enfyra SDK configuration is in `enfyra.config.ts` file, separate from Next.js config:

```typescript
// enfyra.config.ts
import type { EnfyraConfig } from '@enfyra/sdk-next/plugin';

const enfyraConfig: EnfyraConfig = {
  apiUrl: process.env.ENFYRA_API_URL || 'https://api.enfyra.com',
  apiPrefix: '/enfyra/api', // Optional, defaults to '/enfyra/api'
};

export default enfyraConfig;
```

### No Next.js Config Changes Needed

The SDK automatically loads configuration from `enfyra.config.ts` when imported. You don't need to modify your `next.config.ts` at all:

```typescript
// next.config.ts - No changes needed!
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["example.com"],
  },
  // ... your other Next.js config options
};

export default nextConfig;
```

The SDK will:

- Automatically load configuration from `enfyra.config.ts` when imported
- Automatically set environment variables from the config file
- Work seamlessly without any Next.js config modifications

### Customizing Proxy/Middleware

The SDK automatically injects Enfyra proxy handling into your `proxy.ts` file. Your existing code is preserved and runs after Enfyra routes are checked.

#### How It Works

When you install the SDK, it automatically:
1. **If `proxy.ts` doesn't exist**: Creates a new file with Enfyra integration
2. **If `proxy.ts` already exists**: Injects Enfyra proxy handling at the beginning of your `proxy()` function
3. Your custom code continues to work as before - nothing is overwritten

#### Example: Custom Proxy with Enfyra Integration

```typescript
// proxy.ts (your existing file)
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  // Your custom routes (handled first)
  if (request.nextUrl.pathname.startsWith("/api/custom")) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Custom route handled" });
  }

  // Enfyra SDK routes are automatically handled here
  // (injected by SDK, but shown for clarity)
  // const enfyraResponse = await enfyraProxy(request);
  // if (enfyraResponse) return enfyraResponse;

  return NextResponse.next();
}

export const config = {
  matcher: ["/enfyra/api/:path*", "/assets/:path*", "/api/custom/:path*"],
};
```

**After SDK injection, your file becomes:**

```typescript
// proxy.ts (automatically modified by SDK)
import { NextRequest, NextResponse } from "next/server";
import { createEnfyraProxy } from '@enfyra/sdk-next/proxy';
import { getEnfyraSDKConfig } from '@enfyra/sdk-next/constants/config';

const enfyraConfig = getEnfyraSDKConfig();
const enfyraProxy = createEnfyraProxy(enfyraConfig);

export async function proxy(request: NextRequest) {
  // Enfyra SDK routes (automatically injected at the beginning)
  const enfyraResponse = await enfyraProxy(request);
  if (enfyraResponse) return enfyraResponse;

  // Your custom routes (preserved - runs after Enfyra routes)
  if (request.nextUrl.pathname.startsWith("/api/custom")) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Custom route handled" });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/enfyra/api/:path*", "/assets/:path*", "/api/custom/:path*"],
};
```

**Important Notes:**

- Your existing `proxy.ts` code is **never overwritten** - only Enfyra integration is injected at the beginning
- Enfyra routes are checked first, then your custom routes run
- If `proxy.ts` doesn't exist, the SDK creates it with a basic Enfyra setup
- Next.js requires `config.matcher` to be a static array - you cannot use spread operators or variables
- You must list all matcher patterns directly in the array
- The SDK generates code directly - no template files are used or copied

## License

MIT

[^next-proxy]: Next.js 16 renamed `middleware.ts` → `proxy.ts`. See the official announcement: [Renaming Middleware to Proxy](https://nextjs.org/docs/messages/middleware-to-proxy).
