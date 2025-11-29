import { cookies } from 'next/headers';
import { $fetch } from 'ofetch';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  EXP_TIME_KEY,
} from '../../constants/auth';
import { joinUrl } from '../../utils/url';

interface TokenValidationResult {
  accessToken: string | null;
  needsRefresh: boolean;
}

export function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decodedPayload = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.warn('Failed to decode JWT:', error);
    return null;
  }
}

export function isAccessTokenExpired(accessToken: string): boolean {
  const decoded = decodeJWT(accessToken);
  if (!decoded || !decoded.exp) {
    return true;
  }
  const expirationTime = decoded.exp * 1000;
  return Date.now() >= expirationTime;
}

/**
 * Validate tokens from cookies (for Server Components and API Routes)
 */
export async function validateTokens(): Promise<TokenValidationResult> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_KEY)?.value || null;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_KEY)?.value || null;

  if (accessToken && !isAccessTokenExpired(accessToken)) {
    return { accessToken, needsRefresh: false };
  } else if (refreshToken && (!accessToken || isAccessTokenExpired(accessToken))) {
    return { accessToken: null, needsRefresh: true };
  }

  return { accessToken: null, needsRefresh: false };
}

/**
 * Validate tokens from NextRequest (for Middleware)
 */
export function validateTokensFromRequest(request: { cookies: { get: (name: string) => { value: string } | undefined } }): TokenValidationResult {
  const accessToken = request.cookies.get(ACCESS_TOKEN_KEY)?.value || null;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_KEY)?.value || null;

  if (accessToken && !isAccessTokenExpired(accessToken)) {
    return { accessToken, needsRefresh: false };
  } else if (refreshToken && (!accessToken || isAccessTokenExpired(accessToken))) {
    return { accessToken: null, needsRefresh: true };
  }

  return { accessToken: null, needsRefresh: false };
}

/**
 * Refresh access token (for Server Components/API Routes)
 */
export async function refreshAccessToken(
  refreshToken: string,
  apiUrl: string
): Promise<string> {
  try {
    const refreshUrl = joinUrl(apiUrl, '/auth/refresh-token');
    const response = await $fetch<{
      accessToken: string;
      refreshToken: string;
      expTime: number;
    }>(refreshUrl, {
      method: 'POST',
      body: { refreshToken },
    });

    const {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expTime: newExpTime,
    } = response;

    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    cookieStore.set(ACCESS_TOKEN_KEY, newAccessToken, cookieOptions);
    cookieStore.set(REFRESH_TOKEN_KEY, newRefreshToken, cookieOptions);
    cookieStore.set(EXP_TIME_KEY, String(newExpTime), cookieOptions);

    return newAccessToken;
  } catch (error) {
    console.warn('Token refresh failed:', error);
    throw error;
  }
}

/**
 * Refresh access token for middleware (returns token only, doesn't set cookies)
 * Middleware should set cookies via NextResponse
 */
export async function refreshAccessTokenForMiddleware(
  refreshToken: string,
  apiUrl: string
): Promise<{ accessToken: string; refreshToken: string; expTime: number }> {
  const refreshUrl = joinUrl(apiUrl, '/auth/refresh-token');
  const response = await $fetch<{
    accessToken: string;
    refreshToken: string;
    expTime: number;
  }>(refreshUrl, {
    method: 'POST',
    body: { refreshToken },
  });

  return response;
}
