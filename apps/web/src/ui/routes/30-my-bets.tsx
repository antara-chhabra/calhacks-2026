import { useEffect } from 'react';
import type { RouteObject } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '@/data/store';
import { BetSlip, MyBets } from '@/ui/betslip';

function MyBetsPage() {
  const [q] = useSearchParams();
  const demo = q.get('demo') === '1';
  const openReplay = useStore((s) => s.openReplay);
  const matchId = useStore((s) => s.openMatchId);
  useEffect(() => { if (!demo) return; openReplay('mock-basic'); useStore.setState({ me: { identity: 'demo', handle: 'demo', balanceCents: 10000, moneyMode: 'ledger' } }); }, [demo, openReplay]);
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="font-semibold text-2xl text-zinc-100">My bets</h1>
      <MyBets />
      {demo && <BetSlip matchId={matchId} />}
    </main>
  );
}

export const order = 30;
export const routes: RouteObject[] = [{ path: '/bets', element: <MyBetsPage /> }];
