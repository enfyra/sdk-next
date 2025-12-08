import { NextRequest, NextResponse } from 'next/server';
import { $fetch } from 'ofetch';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  EXP_TIME_KEY,
} from '../constants/auth';
import { joinUrl } from '../utils/url';
import { getEnfyraSDKConfig } from '../constants/config';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return handleRequest(request, context, 'GET');
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return handleRequest(request, context, 'POST');
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return handleRequest(request, context, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return handleRequest(request, context, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return handleRequest(request, context, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
  method: string
) {
  const params = await context.params;
  const pathSegments = params?.path || [];
  const pathname = '/' + pathSegments.join('/');

  if (pathname === '/login' && method === 'POST') {
    return handleLogin(request);
  }

  if (pathname === '/logout' && method === 'POST') {
    return handleLogout();
  }

  return NextResponse.json(
    { error: 'Route not found' },
    { status: 404 }
  );
}

async function handleLogin(request: NextRequest) {
  const { apiUrl } = getEnfyraSDKConfig();
  
  if (!apiUrl) {
    return NextResponse.json(
      { error: 'apiUrl is not configured in enfyra.config.ts' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const loginUrl = joinUrl(apiUrl, '/auth/login');
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

