import { NextRequest } from 'next/server';
import { success, error, requireAuth } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tasks/[id]
 * Get task details with steps and data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['USER', 'MANAGER', 'ADMIN']);
    const { id } = await params;

    // Get task
    const task = await prisma.task.findFirst({
      where: {
        id,
        ...(user.role === 'USER' ? { userId: user.id } : {}),
      },
      include: {
        offer: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
        stepData: true,
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: true,
          },
        },
      },
    });

    if (!task) {
      return error('Task not found', 404);
    }

    return success({ task });
  } catch (e: any) {
    console.error('Get task error:', e);
    return error(e.message || 'Failed to get task', 400);
  }
}
