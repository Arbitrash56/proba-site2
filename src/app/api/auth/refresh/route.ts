import { NextRequest } from 'next/server';
import { success, error, setAuthCookies } from '@/lib/api-helpers';
import { generateAccessToken, getSession } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return error('No refresh token provided', 401);
    }

    // Get session
    const session = await getSession(refreshToken);

    if (!session) {
      return error('Invalid or expired refresh token', 401);
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      role: session.user.role,
    });

    // Set cookies
    const response = success({
      accessToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        phone: session.user.phone,
        role: session.user.role,
      },
    });

    return setAuthCookies(response, accessToken, refreshToken);
  } catch (e: any) {
    console.error('Refresh token error:', e);
    return error(e.message || 'Failed to refresh token', 401);
  }
}
