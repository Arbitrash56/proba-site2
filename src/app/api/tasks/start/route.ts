import { NextRequest } from 'next/server';
import { success, error, requireAuth, parseBody } from '@/lib/api-helpers';
import { StartTaskSchema } from '@/lib/schemas';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/tasks/start
 * Start a new task for an offer
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(['USER']);

    const body = await parseBody(request);
    const { offerId } = StartTaskSchema.parse(body);

    // Check if offer exists and is active
    const offer = await prisma.offer.findFirst({
      where: {
        id: offerId,
        tenantId: user.tenantId,
        isActive: true,
      },
      include: {
        steps: true,
      },
    });

    if (!offer) {
      return error('Offer not found or inactive', 404);
    }

    // Check if user already has a task for this offer
    const existingTask = await prisma.task.findFirst({
      where: {
        userId: user.id,
        offerId,
        status: {
          in: ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW'],
        },
      },
    });

    if (existingTask) {
      return error('You already have an active task for this offer', 400);
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        offerId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: {
        offer: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    return success({ task });
  } catch (e: any) {
    console.error('Start task error:', e);
    return error(e.message || 'Failed to start task', 400);
  }
}
