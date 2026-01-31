import { NextRequest } from 'next/server';
import { success, error, getCurrentTenant } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/offers
 * Get list of active offers for current tenant
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant();

    // Get query params
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');

    // Build where clause
    const where: any = {
      tenantId: tenant.id,
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    if (difficulty) {
      where.difficultyLevel = difficulty;
    }

    // Get offers
    const offers = await prisma.offer.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        imageUrl: true,
        rewardAmount: true,
        rewardCurrency: true,
        difficultyLevel: true,
        estimatedTime: true,
        requiresVerification: true,
        disclaimers: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return success({ offers });
  } catch (e: any) {
    console.error('Get offers error:', e);
    return error(e.message || 'Failed to get offers', 500);
  }
}
