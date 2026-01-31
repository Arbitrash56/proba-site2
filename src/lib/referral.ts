import { prisma } from './prisma';
import { getTenantReferralConfig } from './tenant';
import { creditReferralCommission } from './ledger';
import { Prisma } from '@prisma/client';

/**
 * MLM Referral System (7 Levels)
 */

const MAX_LEVELS = 7;

/**
 * Build Referral Path (materialized path for tree)
 */
function buildPath(parentPath: string | null, userId: string): string {
  if (!parentPath) {
    return userId;
  }
  return `${parentPath}.${userId}`;
}

/**
 * Parse Path to get all ancestor IDs
 */
function parsePath(path: string): string[] {
  return path.split('.');
}

/**
 * Get Level from Path
 */
function getLevelFromPath(inviterPath: string, inviteePath: string): number {
  const inviterAncestors = parsePath(inviterPath);
  const inviteeAncestors = parsePath(inviteePath);

  // Find position of inviter in invitee's path
  const level = inviteeAncestors.indexOf(inviterPath.split('.')[inviterPath.split('.').length - 1]) + 1;
  return Math.min(level, MAX_LEVELS);
}

/**
 * Create Referral Relationships (when user registers with referral code)
 */
export async function createReferralRelationships(
  tenantId: string,
  inviteeId: string,
  inviterCode: string
) {
  // Find inviter by referral code
  const inviter = await prisma.user.findUnique({
    where: { referralCode: inviterCode },
    include: {
      inviterReferrals: {
        where: { tenantId },
        orderBy: { level: 'asc' },
      },
    },
  });

  if (!inviter || inviter.tenantId !== tenantId) {
    throw new Error('Invalid referral code');
  }

  // Prevent self-referral
  if (inviter.id === inviteeId) {
    throw new Error('Cannot refer yourself');
  }

  // Check if already referred
  const existing = await prisma.referral.findUnique({
    where: {
      inviterId_inviteeId: {
        inviterId: inviter.id,
        inviteeId,
      },
    },
  });

  if (existing) {
    throw new Error('Already referred by this user');
  }

  // Get inviter's upline (ancestors)
  const inviterUpline = await prisma.referral.findMany({
    where: {
      inviteeId: inviter.id,
      tenantId,
    },
    orderBy: { level: 'asc' },
    take: MAX_LEVELS - 1, // Leave room for direct referral
  });

  // Create referral relationships
  const referrals: Prisma.ReferralCreateManyInput[] = [];

  // Level 1: Direct referral
  referrals.push({
    tenantId,
    inviterId: inviter.id,
    inviteeId,
    level: 1,
    path: buildPath(null, inviteeId),
  });

  // Levels 2-7: Upline referrals
  inviterUpline.forEach((uplineRef, index) => {
    if (index + 2 <= MAX_LEVELS) {
      referrals.push({
        tenantId,
        inviterId: uplineRef.inviterId,
        inviteeId,
        level: index + 2,
        path: buildPath(uplineRef.path, inviteeId),
      });
    }
  });

  // Insert all relationships
  await prisma.referral.createMany({
    data: referrals,
    skipDuplicates: true,
  });

  // Update user's referredById
  await prisma.user.update({
    where: { id: inviteeId },
    data: { referredById: inviter.id },
  });

  return referrals.length;
}

/**
 * Get User's Referrals by Level
 */
export async function getUserReferrals(userId: string, level?: number) {
  const where: Prisma.ReferralWhereInput = {
    inviterId: userId,
    ...(level && { level }),
  };

  const referrals = await prisma.referral.findMany({
    where,
    include: {
      invitee: {
        select: {
          id: true,
          profile: true,
          createdAt: true,
          status: true,
        },
      },
    },
    orderBy: [{ level: 'asc' }, { createdAt: 'desc' }],
  });

  return referrals;
}

/**
 * Get Referral Tree Structure
 */
export async function getReferralTree(userId: string) {
  const referrals = await getUserReferrals(userId);

  // Group by level
  const tree: Record<number, any[]> = {};
  for (let i = 1; i <= MAX_LEVELS; i++) {
    tree[i] = referrals.filter((r) => r.level === i);
  }

  return tree;
}

/**
 * Get Referral Statistics
 */
export async function getReferralStats(userId: string) {
  const referrals = await getUserReferrals(userId);

  const stats = {
    total: referrals.length,
    byLevel: {} as Record<number, number>,
    activeUsers: 0,
  };

  for (let i = 1; i <= MAX_LEVELS; i++) {
    stats.byLevel[i] = referrals.filter((r) => r.level === i).length;
  }

  stats.activeUsers = referrals.filter((r) => r.invitee.status === 'ACTIVE').length;

  return stats;
}

/**
 * Distribute Referral Commissions
 * Called when a task is approved and reward is credited
 */
export async function distributeReferralCommissions(
  tenantId: string,
  userId: string,
  taskId: string,
  baseAmount: number
) {
  // Get tenant referral config
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const config = getTenantReferralConfig(user.tenant);

  // Get all inviters (upline)
  const referrals = await prisma.referral.findMany({
    where: {
      inviteeId: userId,
      tenantId,
    },
    orderBy: { level: 'asc' },
  });

  const commissions: Array<{
    userId: string;
    amount: number;
    level: number;
    percentage: number;
  }> = [];

  // Calculate commissions for each level
  for (const referral of referrals) {
    const levelKey = `L${referral.level}` as keyof typeof config;
    const percentage = config[levelKey] || 0;

    if (percentage > 0) {
      const amount = (baseAmount * percentage) / 100;

      commissions.push({
        userId: referral.inviterId,
        amount,
        level: referral.level,
        percentage,
      });

      // Credit commission to ledger
      await creditReferralCommission(
        referral.inviterId,
        taskId,
        amount,
        referral.level,
        percentage
      );
    }
  }

  return commissions;
}

/**
 * Get Total Earned from Referrals
 */
export async function getTotalReferralEarnings(userId: string) {
  const account = await prisma.ledgerAccount.findUnique({
    where: { userId },
    include: {
      entries: {
        where: {
          category: 'REFERRAL_COMMISSION',
          status: 'COMPLETED',
        },
      },
    },
  });

  if (!account) {
    return 0;
  }

  const total = account.entries.reduce((sum, entry) => {
    return sum + Number(entry.amount);
  }, 0);

  return total;
}

/**
 * Validate Referral Code
 */
export async function validateReferralCode(code: string, tenantId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { referralCode: code },
  });

  return !!user && user.tenantId === tenantId && user.status === 'ACTIVE';
}
