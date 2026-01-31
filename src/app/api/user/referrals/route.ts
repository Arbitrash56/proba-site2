import { NextRequest } from 'next/server';
import { success, error, requireAuth } from '@/lib/api-helpers';
import { getReferralTree, getReferralStats, getTotalReferralEarnings } from '@/lib/referral';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const tree = await getReferralTree(user.id);
    const stats = await getReferralStats(user.id);
    const earnings = await getTotalReferralEarnings(user.id);

    return success({
      referralCode: user.referralCode,
      tree,
      stats,
      earnings,
    });
  } catch (e: any) {
    return error(e.message, 400);
  }
}
