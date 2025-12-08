import { NextRequest, NextResponse } from 'next/server';
import { validateTokensFromRequest, refreshAccessTokenForMiddleware } from './server/utils/refreshToken';
import { getProxyUrl, proxyRequest } from './server/utils/proxy';
import { ENFYRA_API_PREFIX, getEnfyraSDKConfig, type EnfyraSDKConfig } from './constants/config';
import { REFRESH_TOKEN_KEY, ACCESS_TOKEN_KEY, EXP_TIME_KEY } from './constants/auth';
import { $fetch } from 'ofetch';
import { joinUrl } from './utils/url';

function createEnfyraProxy(config: EnfyraSDKConfig) {
  const ENFYRA_API_URL = config.apiUrl;
  const API_PREFIX = config.apiPrefix || ENFYRA_API_PREFIX;

  async function handleLogin(request: NextRequest) {
    if (!ENFYRA_API_URL) {
      return NextResponse.json(
        { error: 'apiUrl is not configured in enfyra.config.ts' },
        { status: 500 }
      );
    }

    try {
      const body = await request.json();
      const loginUrl = joinUrl(ENFYRA_API_URL, '/auth/login');
      const response = await $fetch<any>(loginUrl, {
        method: 'POST',
        body,
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      });

      const { accessToken, refreshToken, expTime } = response;

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      };

      const nextResponse = NextResponse.json({ accessToken });
      nextResponse.cookies.set(ACCESS_TOKEN_KEY, accessToken, cookieOptions);
      nextResponse.cookies.set(REFRESH_TOKEN_KEY, refreshToken, cookieOptions);
      nextResponse.cookies.set(EXP_TIME_KEY, String(expTime), cookieOptions);

      return nextResponse;
    } catch (err: any) {
      const statusCode = err?.response?.status || err?.statusCode || 401;
      const errorData = err?.response?._data || err?.data;

      let errorMessage = 'Authentication failed';
      let errorCode = 'AUTHENTICATION_ERROR';

      if (errorData?.error) {
        errorMessage = errorData.error.message || errorData.message || errorMessage;
        errorCode = errorData.error.code || errorCode;
      }

      return NextResponse.json(
        {
          code: errorCode,
          message: errorMessage,
          details: errorData?.error?.details,
          correlationId: errorData?.error?.correlationId,
        },
        { status: statusCode }
      );
    }
  }

  function handleLogout() {
    const response = NextResponse.json({ success: true });
    response.cookies.delete(ACCESS_TOKEN_KEY);
    response.cookies.delete(REFRESH_TOKEN_KEY);
    response.cookies.delete(EXP_TIME_KEY);
    return response;
  }

  return async function enfyraProxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname === `${API_PREFIX}/login` && request.method === 'POST') {
      return handleLogin(request);
    }

    if (pathname === `${API_PREFIX}/logout` && request.method === 'POST') {
      return handleLogout();
    }

  if (pathname.startsWith(API_PREFIX + '/') || pathname === API_PREFIX || pathname.startsWith('/assets/')) {
    const { accessToken, needsRefresh } = validateTokensFromRequest(request);
    let currentAccessToken = accessToken;
    let responseToReturn: NextResponse | null = null;

    if (needsRefresh && !accessToken) {
      const refreshToken = request.cookies.get(REFRESH_TOKEN_KEY)?.value;
      if (refreshToken) {
        try {
          const tokenData = await refreshAccessTokenForMiddleware(refreshToken, ENFYRA_API_URL);
          currentAccessToken = tokenData.accessToken;

          const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            path: '/',
          };

          responseToReturn = new NextResponse();
          responseToReturn.cookies.set(ACCESS_TOKEN_KEY, tokenData.accessToken, cookieOptions);
          responseToReturn.cookies.set(REFRESH_TOKEN_KEY, tokenData.refreshToken, cookieOptions);
          responseToReturn.cookies.set(EXP_TIME_KEY, String(tokenData.expTime), cookieOptions);
        } catch (error) {}
      }
    }

    const headers: Record<string, string> = {};
    if (currentAccessToken) {
      headers['Authorization'] = `Bearer ${currentAccessToken}`;
    }

    const proxyUrl = getProxyUrl(
      request.nextUrl.pathname + request.nextUrl.search,
      ENFYRA_API_URL,
      API_PREFIX
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Enfyra SDK][proxy] Forwarding:', request.method, proxyUrl);
    }

    try {
      const proxyResponse = await proxyRequest(proxyUrl, request, headers);
      
      if (responseToReturn) {
        const proxyBody = await proxyResponse.text();
        const mergedResponse = new NextResponse(proxyBody, {
          status: proxyResponse.status,
          statusText: proxyResponse.statusText,
          headers: proxyResponse.headers,
        });
        responseToReturn.cookies.getAll().forEach(cookie => {
          mergedResponse.cookies.set(cookie.name, cookie.value, {
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite,
            path: cookie.path,
            maxAge: cookie.maxAge,
            expires: cookie.expires,
          });
        });
        return mergedResponse;
      }
      
      return proxyResponse;
    } catch (error) {
      return NextResponse.json(
        { error: 'Proxy request failed', message: (error as Error).message },
        { status: 500 }
      );
    }
  }

    return NextResponse.next();
  };
}

export async function enfyraProxy(request: any) {
  const config = getEnfyraSDKConfig();
  return createEnfyraProxy(config)(request);
}

export { createEnfyraProxy, getEnfyraSDKConfig };
export type { EnfyraSDKConfig };

