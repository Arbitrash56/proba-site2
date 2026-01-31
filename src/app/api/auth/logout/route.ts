import { NextRequest } from 'next/server';
import { success, error, clearAuthCookies } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/logout
 * Logout user and clear session
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (refreshToken) {
      // Delete session
      await prisma.session.deleteMany({
        where: { refreshToken },
      });
    }

    // Clear cookies
    const response = success({ message: 'Logged out successfully' });
    return clearAuthCookies(response);
  } catch (e: any) {
    console.error('Logout error:', e);
    return error(e.message || 'Failed to logout', 400);
  }
}
