// Scheduler candidates (FC-F-002). House fighters come from HOUSE_ROSTER + agents/house/<id>.strategy.json + the pinned
// Factory droid persona .factory/droids/fc-<id>.md (agents/rules.md is added by the fighter prompt).
// Model ids come from env FC_MODEL_<ID> and are never logged.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOUSE_FIGHTERS, HOUSE_ROSTER, type FighterId, type Strategy } from '@fc/contracts';
import type { Env } from './env.js';
import { DEFAULT_REPO_ROOT, loadHouseDroid, readLock } from './fighters/droid/persona.js';
import type { Candidate } from './match/types.js';
import type { Stdb } from './stdb.js';

const DEFAULT_AGENTS_ROOT = fileURLToPath(new URL('../../../agents/', import.meta.url));

export type CandidateSource = {
  /** Eligible fighters, with rotation state applied. */
  list(): Promise<Candidate[]>;
  /** Record that these fighters just fought (rotation) and their new Elo. */
  played(fighterIds: FighterId[], elo?: { fighterId: FighterId; after: number }[]): void;
};

export function loadHouseCandidates(env: Env, agentsRoot: string = DEFAULT_AGENTS_ROOT): Candidate[] {
  const repoRoot = agentsRoot === DEFAULT_AGENTS_ROOT ? DEFAULT_REPO_ROOT : join(agentsRoot, '..');
  const lock = readLock(repoRoot);
  const out: Candidate[] = [];
  for (const id of HOUSE_FIGHTERS) {
    const dir = join(agentsRoot, 'house');
    const sp = join(dir, `${id}.strategy.json`);
    if (!existsSync(sp)) continue;
    const strategy = JSON.parse(readFileSync(sp, 'utf8')) as Strategy;
    const persona = loadHouseDroid(id, repoRoot, lock).body;
    const modelId = (env as unknown as Record<string, string | undefined>)[`FC_MODEL_${id.toUpperCase()}`] ?? null;
    const reasoningEffort = (env as unknown as Record<string, string | undefined>)[`FC_EFFORT_${id.toUpperCase()}`] ?? null;
    out.push({
      fighter: HOUSE_ROSTER[id], origin: 'house', engine: env.FC_ENGINE, persona, strategy, tier: 'pro',
      elo: 1000, lastMatchAt: 0, active: true, modelId, reasoningEffort,
    });
  }
  return out;
}

export function createCandidateSource(env: Env, opts: { agentsRoot?: string; now?: () => number; stdb?: Stdb } = {}): CandidateSource {
  const now = opts.now ?? Date.now;
  const house = loadHouseCandidates(env, opts.agentsRoot);
  const state = new Map<FighterId, { lastMatchAt: number; elo: number }>();
  return {
    async list() {
      // Forged fighters join the rotation as soon as they exist; debutPending puts them in the next match.
      const env2 = env as unknown as Record<string, string | undefined>;
      const community: Candidate[] = (opts.stdb?.communityFighters?.() ?? []).map((f) => ({
        fighter: f.fighter, origin: 'community', engine: env.FC_ENGINE, persona: f.persona, strategy: f.strategy, tier: f.tier,
        elo: f.elo, lastMatchAt: f.lastMatchAt, debutPending: f.debutPending, active: true,
        modelId: env2[`FC_TIER_${f.tier.toUpperCase()}_MODEL`] ?? null, reasoningEffort: null,
      }));
      return [...house, ...community].map((c) => {
        const s = state.get(c.fighter.id);
        return s ? { ...c, lastMatchAt: s.lastMatchAt, elo: s.elo, debutPending: false } : c;
      });
    },
    played(ids, elo) {
      const t = now();
      for (const id of ids) {
        const prev = state.get(id) ?? { lastMatchAt: 0, elo: house.find((c) => c.fighter.id === id)?.elo ?? 1000 };
        state.set(id, { ...prev, lastMatchAt: t, elo: elo?.find((e) => e.fighterId === id)?.after ?? prev.elo });
      }
    },
  };
}
