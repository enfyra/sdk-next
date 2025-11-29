import { cookies } from 'next/headers';
import { validateTokens, refreshAccessToken } from './utils/refreshToken';
import { ENFYRA_API_PREFIX } from '../constants/config';
import { joinUrl } from '../utils/url';
import type { ApiError } from '../types';

export interface FetchEnfyraApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  query?: Record<string, any>;
  errorContext?: string;
  onError?: (error: ApiError, context?: string) => void;
}

export async function fetchEnfyraApi<T = any>(
  path: string,
  options: FetchEnfyraApiOptions = {}
): Promise<{ data: T | null; error: ApiError | null }> {
  const apiUrl = process.env.ENFYRA_API_URL;
  const apiPrefix = process.env.ENFYRA_API_PREFIX || ENFYRA_API_PREFIX;

  if (!apiUrl) {
    const apiError: ApiError = {
      message: 'ENFYRA_API_URL is not configured',
      status: 500,
    };
    if (options.onError) {
      options.onError(apiError, options.errorContext);
    } else {
      console.error(`[Enfyra API Error] ${apiError.message}`, {
        status: apiError.status,
        context: options.errorContext,
      });
    }
    return { data: null, error: apiError };
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
        // Token refresh failed, proceed without token
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const fullPath = joinUrl(apiPrefix, cleanPath);
  const url = new URL(fullPath, baseUrl);

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
    
    const apiError: ApiError = {
      message: errorData?.message || errorData?.error?.message || response.statusText || 'Request failed',
      status: response.status,
      data: errorData,
      response,
    };

    if (options.onError) {
      options.onError(apiError, options.errorContext);
    } else {
      const errorMessage = apiError.message || 'Request failed';
      const errorStatus = apiError.status || 'Unknown';
      const errorContext = options.errorContext || 'Unknown context';
      
      console.error(`[Enfyra API Error] ${errorMessage}`, {
        status: errorStatus,
        context: errorContext,
        ...(apiError.data && { data: apiError.data }),
      });
    }

    return { data: null, error: apiError };
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const json = await response.json();
    return { data: json as T, error: null };
  }

  const text = (await response.text()) as T;
  return { data: text, error: null };
}

