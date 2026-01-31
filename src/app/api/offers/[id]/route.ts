import { NextRequest } from 'next/server';
import { success, error, getCurrentTenant } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/offers/[id]
 * Get offer details with steps
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getCurrentTenant();
    const { id } = await params;

    // Get offer with steps
    const offer = await prisma.offer.findFirst({
      where: {
        id,
        tenantId: tenant.id,
        isActive: true,
      },
      include: {
        steps: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!offer) {
      return error('Offer not found', 404);
    }

    return success({ offer });
  } catch (e: any) {
    console.error('Get offer error:', e);
    return error(e.message || 'Failed to get offer', 500);
  }
}
