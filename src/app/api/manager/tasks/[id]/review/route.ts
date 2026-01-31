import { NextRequest } from 'next/server';
import { success, error, requireAuth, parseBody } from '@/lib/api-helpers';
import { ReviewTaskSchema } from '@/lib/schemas';
import { prisma } from '@/lib/prisma';
import { creditTaskReward } from '@/lib/ledger';
import { distributeReferralCommissions } from '@/lib/referral';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const manager = await requireAuth(['MANAGER', 'ADMIN']);
    const { id: taskId } = await params;

    const body = await parseBody(request);
    const { action, notes, rejectionReason } = ReviewTaskSchema.parse({ taskId, ...body });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { offer: true, user: true },
    });

    if (!task) {
      return error('Task not found', 404);
    }

    if (task.status !== 'SUBMITTED') {
      return error('Task is not submitted for review', 400);
    }

    if (action === 'approve') {
      await prisma.$transaction(async (tx) => {
        // Update task
        await tx.task.update({
          where: { id: taskId },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewedById: manager.id,
            approvalNotes: notes,
          },
        });

        // Credit reward
        await creditTaskReward(
          task.userId,
          taskId,
          Number(task.offer.rewardAmount),
          `Reward for task: ${task.offer.title}`
        );

        // Distribute referral commissions
        await distributeReferralCommissions(
          task.user.tenantId,
          task.userId,
          taskId,
          Number(task.offer.rewardAmount)
        );
      });

      return success({ message: 'Task approved and reward credited' });
    } else {
      // Reject
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedById: manager.id,
          rejectionReason,
        },
      });

      return success({ message: 'Task rejected' });
    }
  } catch (e: any) {
    console.error('Review task error:', e);
    return error(e.message, 400);
  }
}
