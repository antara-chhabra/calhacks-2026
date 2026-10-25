// Shared SpacetimeDB type builders mirroring @fc/contracts (PRD §8.2/§8.4). Enum-like unions are stored as strings;
// the contracts zod schemas validate them at the runner and web edges (ADR-015).
import { t } from 'spacetimedb/server';

export const Palette = t.object('Palette', {
  primary: t.string(), secondary: t.string(), accent: t.string(), skin: t.string(),
});
export const SkinSpec = t.object('SkinSpec', {
  palette: Palette, head: t.string(), weapon: t.string(), emblem: t.string(), build: t.string(),
});
export const Strategy = t.object('Strategy', {
  verify: t.bool(), order: t.string(), risk: t.string(), taunts: t.u8(),
});
export const ProblemMeta = t.object('ProblemMeta', {
  idx: t.u8(), difficulty: t.u8(), points: t.u8(),
});
export const Standing = t.object('Standing', {
  fighterId: t.string(), rank: t.u8(), points: t.u32(), scorePct: t.f64(),
  hits: t.u32(), misses: t.u32(), overturned: t.u32(), yellow: t.u32(), red: t.u32(),
  firstHitMs: t.option(t.u32()), lastScoreMs: t.option(t.u32()),
  clutchPoints: t.u32(), missesRecovered: t.u32(),
});
export const MarketSpec = t.object('MarketSpec', {
  id: t.string(), kind: t.string(), subject: t.option(t.string()), line: t.option(t.f64()),
  label: t.string(), outcomes: t.array(t.string()), seeds: t.array(t.u64()), rakeBps: t.u16(),
});
export const FighterStatsObj = t.object('FighterStatsObj', {
  fighterId: t.string(), category: t.string(), matches: t.u32(), wins: t.u32(), podiums: t.u32(),
  avgScorePct: t.f64(), spd: t.f64(), acc: t.f64(), clu: t.f64(), dis: t.f64(), grt: t.f64(), con: t.f64(), ovr: t.f64(),
  form: t.string(), streak: t.i32(), upsetUntil: t.option(t.timestamp()), eloHistory: t.array(t.f64()),
  backersWon: t.u32(), earningsUsdc: t.f64(),
});
export const ForgeSpec = t.object('ForgeSpec', {
  name: t.string(), title: t.string(), catchphrase: t.string(), archetype: t.string(),
  persona: t.string(), strategy: Strategy, tier: t.string(), skin: SkinSpec,
  payoutAddress: t.option(t.string()), endpointUrl: t.option(t.string()),
});
export const HouseFighterInput = t.object('HouseFighterInput', {
  id: t.string(), name: t.string(), title: t.string(), archetype: t.string(), skin: SkinSpec,
  catchphrase: t.string(), bio: t.string(), strategyBlurb: t.string(), strategy: Strategy, tier: t.string(),
});
export const PostedEvent = t.object('PostedEvent', { type: t.string(), data: t.string() });
export const MarketResult = t.object('MarketResult', { marketId: t.string(), outcome: t.string() });
export const EloUpdate = t.object('EloUpdate', { fighterId: t.string(), after: t.f64() });
