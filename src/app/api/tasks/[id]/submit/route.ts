import { NextRequest } from 'next/server';
import { success, error, requireAuth } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/tasks/[id]/submit
 * Submit task for review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['USER']);
    const { id: taskId } = await params;

    // Get task with steps
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: user.id,
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
      },
    });

    if (!task) {
      return error('Task not found', 404);
    }

    if (task.status !== 'IN_PROGRESS') {
      return error('Task is not in progress', 400);
    }

    // Check if all required steps are completed
    const requiredSteps = task.offer.steps.filter((s) => s.isRequired);
    const completedSteps = task.stepData;

    for (const step of requiredSteps) {
      const completed = completedSteps.find((sd) => sd.stepId === step.id);
      if (!completed) {
        return error(`Step "${step.title}" is required but not completed`, 400);
      }
    }

    // Submit task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    return success({
      task: updatedTask,
      message: 'Task submitted successfully. Waiting for review.',
    });
  } catch (e: any) {
    console.error('Submit task error:', e);
    return error(e.message || 'Failed to submit task', 400);
  }
}
