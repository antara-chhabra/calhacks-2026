import type { MarketView, MatchRow, Store } from '@/data/store';

/** Find the broadcast on the backend, including explicitly labelled mock/demo matches. */
export function ongoingFight(s: Pick<Store, 'matches' | 'liveMatchId'>): MatchRow | null {
  const eligible = Object.values(s.matches).filter((m) => ['locked', 'live', 'review'].includes(m.status));
  return eligible.find((m) => m.id === s.liveMatchId) ?? eligible.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0) || b.number - a.number)[0] ?? null;
}

/** Keep an explicit replay and its final result watchable without calling it a live-agent run. */
export function arenaMatch(s: Pick<Store, 'matches' | 'liveMatchId' | 'openMatchId' | 'watch' | 'conn'>): MatchRow | null {
  const watched = s.watch.matchId ? s.matches[s.watch.matchId] : undefined;
  if (s.conn === 'replay') return s.watch.mode === 'replay' ? watched ?? null : null;
  const broadcast = ongoingFight(s);
  if (broadcast) return broadcast;
  if (watched && s.watch.mode === 'live' && s.watch.state.matchId === watched.id) return watched;
  const upcoming = s.openMatchId ? s.matches[s.openMatchId] : undefined;
  return upcoming && ['open', 'scheduled'].includes(upcoming.status) ? upcoming : null;
}

export function marketTotals(market: MarketView) {
  return Object.values(market.pools).reduce((sum, pool) => ({
    volume: sum.volume + pool.staked,
    pool: sum.pool + pool.staked + pool.seed,
    bettors: sum.bettors + pool.bettors,
  }), { volume: 0, pool: 0, bettors: 0 });
}
