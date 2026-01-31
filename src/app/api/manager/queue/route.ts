import { NextRequest } from 'next/server';
import { success, error, requireAuth, getCurrentTenant } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(['MANAGER', 'ADMIN']);
    const tenant = await getCurrentTenant();

    const tasks = await prisma.task.findMany({
      where: {
        offer: { tenantId: tenant.id },
        status: 'SUBMITTED',
      },
      include: {
        user: { select: { id: true, email: true, phone: true, profile: true } },
        offer: { select: { id: true, title: true, rewardAmount: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });

    return success({ tasks });
  } catch (e: any) {
    return error(e.message, 400);
  }
}
