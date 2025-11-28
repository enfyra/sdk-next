import { NextRequest, NextResponse } from 'next/server';
import { $fetch } from 'ofetch';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  EXP_TIME_KEY,
} from '@enfyra/sdk-next/constants/auth';

const ENFYRA_API_URL = process.env.ENFYRA_API_URL || '';

export async function POST(request: NextRequest) {
  if (!ENFYRA_API_URL) {
    return NextResponse.json(
      { error: 'ENFYRA_API_URL is not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const response = await $fetch<any>(`${ENFYRA_API_URL}/auth/login`, {
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

