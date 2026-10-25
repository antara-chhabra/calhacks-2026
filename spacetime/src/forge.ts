// Forge and house-fighter reducers (PRD §8.8). B-05.
import { SenderError, t } from 'spacetimedb/server';
import spacetimedb from './schema.js';
import { ForgeSpec, HouseFighterInput } from './types.js';
import { requirePlayer, requireRunner, type Ctx } from './auth.js';
import { applyLedger } from './logic/ledger.js';
import {
  FORGE_FEE_CENTS, MAX_ACTIVE_FIGHTERS, ForgeError, deriveFighterId, forceVerifyOff, nameKey,
  validateAddress, validateForgeSpec, validateName, validateShortText,
} from './logic/forge.js';

function guard<T>(fn: () => T): T {
  try { return fn(); } catch (e) {
    if (e instanceof ForgeError) throw new SenderError(e.code);
    throw e;
  }
}

function getOwnedFighter(ctx: Ctx, fighterId: string) {
  const f = ctx.db.fighter.id.find(fighterId);
  if (!f || !f.creator || !f.creator.isEqual(ctx.sender)) throw new SenderError('not_creator');
  return f;
}

export const create_fighter = spacetimedb.reducer({ name: 'create_fighter' }, { spec: ForgeSpec }, (ctx, { spec }) => {
  const player = requirePlayer(ctx);
  guard(() => validateForgeSpec(spec));
  if (ctx.db.fighter.nameKey.find(nameKey(spec.name))) throw new SenderError('name_taken');
  let active = 0;
  for (const f of ctx.db.fighter.iter()) {
    if (f.creator && f.creator.isEqual(ctx.sender) && f.status !== 'retired') active++;
  }
  if (active >= MAX_ACTIVE_FIGHTERS) throw new SenderError('too_many_fighters');
  if (player.balanceCents < FORGE_FEE_CENTS) throw new SenderError('insufficient_funds');

  const micros = ctx.timestamp.microsSinceUnixEpoch;
  let id = deriveFighterId(ctx.sender.toHexString(), micros);
  for (let salt = 1; ctx.db.fighter.id.find(id); salt++) id = deriveFighterId(ctx.sender.toHexString(), micros, salt);

  applyLedger(ctx, ctx.sender, -FORGE_FEE_CENTS, 'forge_fee', id);
  const byo = spec.endpointUrl != null;
  ctx.db.fighter.insert({
    id, name: spec.name, nameKey: nameKey(spec.name), title: spec.title, archetype: spec.archetype,
    origin: byo ? 'byo_http' : 'community', creator: ctx.sender, skin: spec.skin,
    catchphrase: spec.catchphrase, bio: '', strategyBlurb: '', version: 1, status: 'provisional',
    debutPending: true, elo: 1000, matches: 0, lastMatchAt: undefined, walletAddress: undefined,
    payoutAddress: spec.payoutAddress ?? undefined, createdAt: ctx.timestamp,
  });
  ctx.db.fighterSecret.insert({
    fighterId: id, persona: spec.persona, strategy: forceVerifyOff(spec.strategy), tier: spec.tier,
    endpointUrl: spec.endpointUrl ?? undefined, uagentAddress: undefined,
  });
});

export const retire_fighter = spacetimedb.reducer({ name: 'retire_fighter' }, { fighterId: t.string() }, (ctx, { fighterId }) => {
  const f = getOwnedFighter(ctx, fighterId);
  ctx.db.fighter.id.update({ ...f, status: 'retired' });
});

export const set_payout_address = spacetimedb.reducer({ name: 'set_payout_address' },
  { fighterId: t.string(), address: t.string() }, (ctx, { fighterId, address }) => {
    const f = getOwnedFighter(ctx, fighterId);
    guard(() => validateAddress(address));
    ctx.db.fighter.id.update({ ...f, payoutAddress: address });
  });

export const upsert_house_fighter = spacetimedb.reducer({ name: 'upsert_house_fighter' },
  { fighter: HouseFighterInput }, (ctx, { fighter: h }) => {
    requireRunner(ctx);
    if (h.id.length === 0 || h.id.length > 40) throw new SenderError('bad_spec');
    guard(() => { validateName(h.name); validateShortText(h.title, 40); validateShortText(h.catchphrase, 60, true); });
    const key = nameKey(h.name);
    const clash = ctx.db.fighter.nameKey.find(key);
    if (clash && clash.id !== h.id) throw new SenderError('name_taken');
    const existing = ctx.db.fighter.id.find(h.id);
    const pub = {
      name: h.name, nameKey: key, title: h.title, archetype: h.archetype, skin: h.skin,
      catchphrase: h.catchphrase, bio: h.bio, strategyBlurb: h.strategyBlurb,
    };
    if (existing) {
      if (existing.origin !== 'house') throw new SenderError('not_house');
      ctx.db.fighter.id.update({ ...existing, ...pub, status: 'active' });
    } else {
      ctx.db.fighter.insert({
        id: h.id, ...pub, origin: 'house', creator: undefined, version: 1, status: 'active', debutPending: false,
        elo: 1000, matches: 0, lastMatchAt: undefined, walletAddress: undefined, payoutAddress: undefined,
        createdAt: ctx.timestamp,
      });
    }
    const sec = ctx.db.fighterSecret.fighterId.find(h.id);
    const secret = { fighterId: h.id, persona: sec?.persona ?? '', strategy: h.strategy, tier: h.tier,
      endpointUrl: sec?.endpointUrl, uagentAddress: sec?.uagentAddress };
    if (sec) ctx.db.fighterSecret.fighterId.update(secret); else ctx.db.fighterSecret.insert(secret);
  });
