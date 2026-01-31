import { NextRequest } from 'next/server';
import { success, error, requireAuth } from '@/lib/api-helpers';
import { getUserBalance, getLedgerHistory } from '@/lib/ledger';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const balance = await getUserBalance(user.id);
    const history = await getLedgerHistory(user.id, { limit: 20 });

    return success({ balance, history });
  } catch (e: any) {
    return error(e.message, 400);
  }
}
