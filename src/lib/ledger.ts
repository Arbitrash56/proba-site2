import { prisma } from './prisma';
import { LedgerEntryType, LedgerEntryCategory, LedgerRefType, Prisma } from '@prisma/client';

/**
 * Ledger Service
 * Immutable financial accounting system
 */

export interface CreateLedgerEntryInput {
  userId: string;
  type: LedgerEntryType;
  category: LedgerEntryCategory;
  amount: number | Prisma.Decimal;
  refType: LedgerRefType;
  refId: string;
  description: string;
  metadata?: Record<string, any>;
  createdById?: string;
}

/**
 * Create Ledger Entry (immutable record)
 */
export async function createLedgerEntry(input: CreateLedgerEntryInput) {
  return await prisma.$transaction(async (tx) => {
    // Get or create ledger account
    let account = await tx.ledgerAccount.findUnique({
      where: { userId: input.userId },
    });

    if (!account) {
      account = await tx.ledgerAccount.create({
        data: {
          userId: input.userId,
          currency: 'RUB',
        },
      });
    }

    // Create ledger entry
    const entry = await tx.ledgerEntry.create({
      data: {
        accountId: account.id,
        type: input.type,
        category: input.category,
        amount: input.amount,
        status: 'COMPLETED',
        refType: input.refType,
        refId: input.refId,
        description: input.description,
        metadata: input.metadata || {},
        createdById: input.createdById,
      },
    });

    // Update cached balance
    const amountNum = Number(input.amount);
    if (input.type === 'CREDIT') {
      await tx.ledgerAccount.update({
        where: { id: account.id },
        data: {
          balanceAvailable: {
            increment: amountNum,
          },
        },
      });
    } else {
      await tx.ledgerAccount.update({
        where: { id: account.id },
        data: {
          balanceAvailable: {
            decrement: amountNum,
          },
        },
      });
    }

    return entry;
  });
}

/**
 * Get User Balance
 */
export async function getUserBalance(userId: string) {
  const account = await prisma.ledgerAccount.findUnique({
    where: { userId },
  });

  if (!account) {
    return {
      available: 0,
      pending: 0,
      frozen: 0,
      total: 0,
    };
  }

  return {
    available: Number(account.balanceAvailable),
    pending: Number(account.balancePending),
    frozen: Number(account.balanceFrozen),
    total:
      Number(account.balanceAvailable) +
      Number(account.balancePending) +
      Number(account.balanceFrozen),
  };
}

/**
 * Get Ledger History
 */
export async function getLedgerHistory(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    category?: LedgerEntryCategory;
  }
) {
  const account = await prisma.ledgerAccount.findUnique({
    where: { userId },
  });

  if (!account) {
    return [];
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      accountId: account.id,
      ...(options?.category && { category: options.category }),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });

  return entries;
}

/**
 * Credit Task Reward
 */
export async function creditTaskReward(
  userId: string,
  taskId: string,
  amount: number,
  description: string
) {
  return createLedgerEntry({
    userId,
    type: 'CREDIT',
    category: 'TASK_REWARD',
    amount,
    refType: 'TASK',
    refId: taskId,
    description,
  });
}

/**
 * Credit Referral Commission
 */
export async function creditReferralCommission(
  userId: string,
  referralId: string,
  amount: number,
  level: number,
  percentage: number
) {
  return createLedgerEntry({
    userId,
    type: 'CREDIT',
    category: 'REFERRAL_COMMISSION',
    amount,
    refType: 'REFERRAL',
    refId: referralId,
    description: `Referral commission L${level} (${percentage}%)`,
    metadata: { level, percentage },
  });
}

/**
 * Debit Payout
 */
export async function debitPayout(
  userId: string,
  payoutId: string,
  amount: number,
  description: string
) {
  return createLedgerEntry({
    userId,
    type: 'DEBIT',
    category: 'PAYOUT',
    amount,
    refType: 'PAYOUT',
    refId: payoutId,
    description,
  });
}

/**
 * Manual Adjustment (Admin only)
 */
export async function manualAdjustment(
  userId: string,
  amount: number,
  description: string,
  adminId: string,
  type: 'CREDIT' | 'DEBIT' = 'CREDIT'
) {
  return createLedgerEntry({
    userId,
    type,
    category: 'MANUAL',
    amount,
    refType: 'MANUAL',
    refId: adminId,
    description,
    createdById: adminId,
  });
}

/**
 * Check if user has sufficient balance
 */
export async function hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
  const balance = await getUserBalance(userId);
  return balance.available >= amount;
}

/**
 * Recalculate Balance (repair function)
 * Should only be used for debugging/repair
 */
export async function recalculateBalance(userId: string) {
  const account = await prisma.ledgerAccount.findUnique({
    where: { userId },
    include: { entries: true },
  });

  if (!account) {
    throw new Error('Account not found');
  }

  let available = 0;
  let pending = 0;
  let frozen = 0;

  for (const entry of account.entries) {
    if (entry.status !== 'COMPLETED') continue;

    const amount = Number(entry.amount);
    if (entry.type === 'CREDIT') {
      available += amount;
    } else {
      available -= amount;
    }
  }

  await prisma.ledgerAccount.update({
    where: { id: account.id },
    data: {
      balanceAvailable: available,
      balancePending: pending,
      balanceFrozen: frozen,
    },
  });

  return { available, pending, frozen };
}
