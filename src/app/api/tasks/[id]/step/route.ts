import { NextRequest } from 'next/server';
import { success, error, requireAuth, parseBody } from '@/lib/api-helpers';
import { SubmitTaskStepSchema } from '@/lib/schemas';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/tasks/[id]/step
 * Save task step data
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['USER']);
    const { id: taskId } = await params;

    const body = await parseBody(request);
    const { stepId, payload, files } = SubmitTaskStepSchema.parse({
      taskId,
      ...body,
    });

    // Check if task belongs to user
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
      },
    });

    if (!task) {
      return error('Task not found', 404);
    }

    if (!['DRAFT', 'IN_PROGRESS'].includes(task.status)) {
      return error('Task already submitted', 400);
    }

    // Find step
    const step = task.offer.steps.find((s) => s.id === stepId);
    if (!step) {
      return error('Step not found', 404);
    }

    // Save step data
    const stepData = await prisma.taskStepData.upsert({
      where: {
        taskId_stepId: {
          taskId,
          stepId,
        },
      },
      update: {
        payload,
        fileRefs: files || [],
        completedAt: new Date(),
      },
      create: {
        taskId,
        stepId,
        payload,
        fileRefs: files || [],
        completedAt: new Date(),
      },
    });

    // Update task current step
    await prisma.task.update({
      where: { id: taskId },
      data: {
        currentStep: step.order + 1,
        status: 'IN_PROGRESS',
      },
    });

    return success({ stepData });
  } catch (e: any) {
    console.error('Save step error:', e);
    return error(e.message || 'Failed to save step', 400);
  }
}
