import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getTenantByHost } from './tenant';
import { verifyAccessToken } from './auth';
import { prisma } from './prisma';
import { User, UserRole } from '@prisma/client';

/**
 * API Helper Functions
 */

// Response helpers
export function success<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function error(message: string, status: number = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// Get current tenant from request
export async function getCurrentTenant() {
  const headersList = await headers();
  const host = headersList.get('x-tenant-host') || headersList.get('host') || '';

  const tenant = await getTenantByHost(host);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return tenant;
}

// Get current user from JWT token
export async function getCurrentUser(requiredRoles?: UserRole[]): Promise<User | null> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    return null;
  }

  // Check role if required
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }

  return user;
}

// Require authentication
export async function requireAuth(requiredRoles?: UserRole[]) {
  const user = await getCurrentUser(requiredRoles);

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

// Set auth cookies
export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  // Access token (15 min)
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  });

  // Refresh token (30 days)
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });

  return response;
}

// Clear auth cookies
export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');
  return response;
}

// Parse request body
export async function parseBody<T>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch (e) {
    throw new Error('Invalid JSON body');
  }
}

// Send OTP via email (mock for dev)
export async function sendOTPEmail(email: string, code: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📧 OTP for ${email}: ${code}`);
    return;
  }

  // TODO: Implement actual email sending (Nodemailer, Resend, etc.)
  console.log(`Sending OTP ${code} to ${email}`);
}

// Send OTP via SMS (mock for dev)
export async function sendOTPSMS(phone: string, code: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 OTP for ${phone}: ${code}`);
    return;
  }

  // TODO: Implement actual SMS sending (Twilio, etc.)
  console.log(`Sending OTP ${code} to ${phone}`);
}
