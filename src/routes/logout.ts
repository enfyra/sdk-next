import { NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  EXP_TIME_KEY,
} from '../constants/auth';

export async function POST(
  request: any,
  _context: { params: Promise<{}> }
) {
  const response = NextResponse.json({ success: true });

  response.cookies.delete(ACCESS_TOKEN_KEY);
  response.cookies.delete(REFRESH_TOKEN_KEY);
  response.cookies.delete(EXP_TIME_KEY);

  return response;
}

