import { NextRequest, NextResponse } from 'next/server';
import { validateTokensFromRequest, refreshAccessTokenForMiddleware } from '@enfyra/sdk-next/server/utils/refreshToken';
import { getProxyUrl, proxyRequest } from '@enfyra/sdk-next/server/utils/proxy';
import { ENFYRA_API_PREFIX } from '@enfyra/sdk-next/constants/config';
import { REFRESH_TOKEN_KEY, ACCESS_TOKEN_KEY, EXP_TIME_KEY } from '@enfyra/sdk-next/constants/auth';

const ENFYRA_API_URL = process.env.ENFYRA_API_URL || '';
const API_PREFIX = process.env.ENFYRA_API_PREFIX || ENFYRA_API_PREFIX;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === `${API_PREFIX}/login` || pathname === `${API_PREFIX}/logout`) {
    return NextResponse.next();
  }

  if (pathname.startsWith(API_PREFIX) || pathname.startsWith('/assets/')) {
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
}

export const config = {
  matcher: [
    '/enfyra/api/:path*',
    '/assets/:path*',
  ],
};

