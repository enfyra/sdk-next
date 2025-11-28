import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  EXP_TIME_KEY,
} from '@enfyra/sdk-next/constants/auth';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  // Clear cookies
  response.cookies.delete(ACCESS_TOKEN_KEY);
  response.cookies.delete(REFRESH_TOKEN_KEY);
  response.cookies.delete(EXP_TIME_KEY);

  return response;
}

