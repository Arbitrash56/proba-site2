import { NextRequest } from 'next/server';
import { success, error, requireAuth, parseBody } from '@/lib/api-helpers';
import { UpdateProfileSchema } from '@/lib/schemas';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    return success({ user });
  } catch (e: any) {
    return error(e.message || 'Unauthorized', 401);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await parseBody(request);
    const data = UpdateProfileSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { profile: { ...(user.profile as object), ...data } },
    });

    return success({ user: updated });
  } catch (e: any) {
    return error(e.message, 400);
  }
}
