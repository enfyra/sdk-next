import { cookies } from 'next/headers';
import { validateTokens, refreshAccessToken } from './utils/refreshToken';
import { ACCESS_TOKEN_KEY } from '../constants/auth';
import { ENFYRA_API_PREFIX } from '../constants/config';

export interface FetchEnfyraApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  query?: Record<string, any>;
}

export async function fetchEnfyraApi<T = any>(
  path: string,
  options: FetchEnfyraApiOptions = {}
): Promise<T> {
  const apiUrl = process.env.ENFYRA_API_URL;
  const apiPrefix = process.env.ENFYRA_API_PREFIX || ENFYRA_API_PREFIX;

  if (!apiUrl) {
    throw new Error('ENFYRA_API_URL is not configured');
  }

  const { accessToken, needsRefresh } = await validateTokens();
  let currentAccessToken = accessToken;

  if (needsRefresh && !accessToken) {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;
    if (refreshToken) {
      try {
        currentAccessToken = await refreshAccessToken(refreshToken, apiUrl);
      } catch (error) {
      }
    }
  }

  let rawPath = path;
  let baseQuery: Record<string, any> | undefined;
  const queryIndex = rawPath.indexOf('?');
  if (queryIndex !== -1) {
    const pathPart = rawPath.slice(0, queryIndex);
    const queryString = rawPath.slice(queryIndex + 1);
    rawPath = pathPart || '/';

    if (queryString) {
      baseQuery = {};
      queryString.split('&').forEach((part) => {
        if (!part) return;
        const [key, value] = part.split('=');
        if (!key) return;
        baseQuery![decodeURIComponent(key)] =
          value !== undefined ? decodeURIComponent(value) : '';
      });
    }
  }

  const cleanPath = rawPath.replace(/^\/+/, '');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const url = new URL(`${apiPrefix}/${cleanPath}`, baseUrl);

  const mergedQuery: Record<string, any> | undefined = {
    ...(baseQuery || {}),
    ...(options.query || {}),
  };

  if (mergedQuery) {
    Object.entries(mergedQuery).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Enfyra SDK][server] Fetching URL:', url.toString());
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (currentAccessToken) {
    headers['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
    throw {
      message: errorData.message || 'Request failed',
      status: response.status,
      data: errorData,
      response,
    };
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return await response.json();
  }

  return (await response.text()) as T;
}

