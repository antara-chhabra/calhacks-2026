// B-06: exercise the published module with separate runner and player identities.
// Generate test/module_bindings first; see ../README.md. Uses only disposable local databases.
import assert from 'node:assert/strict';
import { DbConnection } from './module_bindings/index.ts';
import { settleMarket } from '@fc/engine';

const database = process.env.FC_AUTH_DB ?? 'fightcard-o3-auth';
const uri = process.env.FC_AUTH_URI ?? 'ws://127.0.0.1:3000';
if (!/^wss?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(uri) || !database.endsWith('-auth')) {
  throw new Error('auth-live requires a disposable local database ending in -auth');
}

async function connect() {
  return new Promise<DbConnection>((resolve, reject) => {
    DbConnection.builder().withUri(uri).withDatabaseName(database)
      .onConnect((connection) => resolve(connection)).onConnectError((_ctx, error) => reject(error)).build();
  });
}

const runner = await connect();
const player = await connect();
try {
  await runner.reducers.claimRunner({});
  await player.reducers.registerPlayer({ handle: 'auth_player' });
  const skin = {
    palette: { primary: '#E5383B', secondary: '#22202E', accent: '#F2C14E', skin: '#C98B6B' },
    head: 'horned_helm', weapon: 'greatsword', emblem: 'skull', build: 'heavy',
  };
  const fighter = {
    id: 'auth_vex', name: 'Auth Vex', title: 'The Villain', archetype: 'brawler', skin,
    catchphrase: 'Kneel.', bio: '', strategyBlurb: '',
    strategy: { verify: false, order: 'in_order', risk: 'bold', taunts: 1 }, tier: 'standard',
  };
  await runner.reducers.upsertHouseFighter({ fighter });
  const identity = player.identity!;
  const calls: [string, () => Promise<void>][] = [
    ['credit_test_funds', () => player.reducers.creditTestFunds({ identity, amountCents: 100n })],
    ['upsert_house_fighter', () => player.reducers.upsertHouseFighter({ fighter })],
    ['create_match', () => player.reducers.createMatch({ id: 'denied', category: 'integrals', mode: 'mock', isDemo: true,
      fighterIds: [], slots: [], problems: [], commitHash: '', bettingWindowMs: 1000, timeLimitMs: 1000, markets: [] })],
    ['lock_match', () => player.reducers.lockMatch({ matchId: 'missing' })],
    ['start_match', () => player.reducers.startMatch({ matchId: 'missing' })],
    ['post_events', () => player.reducers.postEvents({ matchId: 'missing', events: [] })],
    ['begin_review', () => player.reducers.beginReview({ matchId: 'missing' })],
    ['finalize_match', () => player.reducers.finalizeMatch({ matchId: 'missing', standings: [] })],
    ['reveal_match', () => player.reducers.revealMatch({ matchId: 'missing', problemSetJson: '{}', salt: 'a' })],
    ['settle_match', () => player.reducers.settleMatch({ matchId: 'missing', results: [], elo: [], stats: [] })],
    ['void_match', () => player.reducers.voidMatch({ matchId: 'missing', reason: 'test' })],
    ['record_purse', () => player.reducers.recordPurse({ matchId: 'missing', fighterId: 'auth_vex', kind: 'entry',
      amountUsdc: 0, txRef: '', network: '', coveredByHouse: true, to: '' })],
    ['set_fighter_wallet', () => player.reducers.setFighterWallet({ fighterId: 'auth_vex', address: 'test' })],
  ];
  for (const [name, call] of calls) {
    await assert.rejects(call, /not_runner/, name);
    console.log(`PASS ${name}: player rejected`);
  }
  await assert.rejects(() => player.reducers.claimRunner({}), /runner_already_set/);
  console.log('PASS claim_runner: second identity rejected');

  // The scheduler reducer must not be callable by an arbitrary client.
  const scheduledResponse = await fetch(`${uri.replace(/^ws/, 'http')}/v1/database/${database}/call/auto_lock`, {
    method: 'POST', headers: { Authorization: `Bearer ${player.token}`, 'Content-Type': 'application/json' }, body: '[]',
  });
  assert.equal(scheduledResponse.ok, false);
  assert.match(await scheduledResponse.text(), /scheduled|private|not found|no such|not allowed|internal/i);
  console.log('PASS auto_lock: direct player invocation rejected');

  async function subscribe(connection: DbConnection) {
    await new Promise<void>((resolve, reject) => {
      connection.subscriptionBuilder().onApplied(() => resolve()).onError((_ctx, error) => reject(error))
        .subscribe(['runner_fighter_secrets', 'my_ledger_tx', 'fighter', 'fighter_stats', 'entry', 'match', 'fight_event',
          'player', 'market', 'pool', 'bet'].map((name) => `SELECT * FROM ${name}`));
    });
  }
  await runner.reducers.creditTestFunds({ identity, amountCents: 100n });
  await Promise.all([subscribe(runner), subscribe(player)]);
  assert.equal([...runner.db.runnerFighterSecrets.iter()].length, 1);
  assert.equal([...player.db.runnerFighterSecrets.iter()].length, 0);
  assert.equal([...runner.db.myLedgerTx.iter()].length, 0);
  assert.equal([...player.db.myLedgerTx.iter()].length, 1);
  console.log('PASS views: fighter secrets runner-only; ledger rows sender-only');

  await runner.reducers.upsertHouseFighter({ fighter: { ...fighter, id: 'auth_sage', name: 'Auth Sage' } });
  const stats = {
    fighterId: fighter.id, category: 'integrals', matches: 1, wins: 1, podiums: 1, avgScorePct: 1,
    spd: 60, acc: 60, clu: 60, dis: 60, grt: 60, con: 60, ovr: 60, form: 'W', streak: 1,
    upsetUntil: undefined, eloHistory: [1016], backersWon: 0, earningsUsdc: 0,
  };
  const standings = ['auth_vex', 'auth_sage'].map((fighterId, i) => ({
    fighterId, rank: i + 1, points: i === 0 ? 10 : 0, scorePct: i === 0 ? 1 / 15 : 0,
    hits: i === 0 ? 1 : 0, misses: 0, overturned: 0, yellow: 0, red: 0,
    firstHitMs: undefined, lastScoreMs: undefined, clutchPoints: 0, missesRecovered: 0,
  }));
  const create = (id: string, mode: string, isDemo: boolean, bettingWindowMs = 60_000) => ({
    id, category: 'integrals', mode, isDemo, fighterIds: ['auth_vex', 'auth_sage'], slots: [1, 2],
    problems: Array.from({ length: 5 }, (_, i) => ({ idx: i + 1, difficulty: i + 1, points: (i + 1) * 10 })),
    commitHash: '0'.repeat(64), bettingWindowMs, timeLimitMs: 1000,
    markets: [{ id: `${id}:winner`, kind: 'winner', subject: undefined, line: undefined, label: 'Winner',
      outcomes: ['auth_vex', 'auth_sage'], seeds: [500n, 500n], rakeBps: 500 }],
  });

  for (const [id, mode, isDemo] of [['auth_mock', 'mock', false], ['auth_demo', 'live', true]] as const) {
    await runner.reducers.createMatch(create(id, mode, isDemo));
    await runner.reducers.lockMatch({ matchId: id });
    await runner.reducers.startMatch({ matchId: id });
    await runner.reducers.beginReview({ matchId: id });
    await runner.reducers.finalizeMatch({ matchId: id, standings });
    await runner.reducers.revealMatch({ matchId: id, problemSetJson: '{}', salt: 'test' });
    await runner.reducers.settleMatch({ matchId: id, results: [{ marketId: `${id}:winner`, outcome: 'auth_vex' }],
      elo: [{ fighterId: fighter.id, after: 2000 }], stats: [stats] });
    assert.equal(runner.db.fighter.id.find(fighter.id)?.matches, 0);
    assert.equal(runner.db.fighter.id.find(fighter.id)?.elo, 1000);
    assert.equal([...runner.db.fighterStats.iter()].length, 0);
    assert.equal(runner.db.match.id.find(id)?.status, 'settled');
    const events = [...runner.db.fightEvent.iter()].filter((e) => e.matchId === id).sort((a, b) => a.seq - b.seq);
    assert.deepEqual(events.map((e) => e.seq), events.map((_e, i) => i + 1));
    assert.deepEqual(events.map((e) => e.type), ['match.created', 'betting.locked', 'match.started', 'match.timeup',
      'match.result', 'match.revealed', 'match.settled']);
    console.log(`PASS ${id}: canonical lifecycle; ratings/cards unaffected despite nonempty rating payload`);
  }

  // Rated settlement still updates the card and pays precisely the shared engine's integer-cent payout.
  const ratedId = 'auth_rated';
  await runner.reducers.creditTestFunds({ identity, amountCents: 1000n });
  await runner.reducers.createMatch(create(ratedId, 'live', false));
  await player.reducers.placeBet({ marketId: `${ratedId}:winner`, outcome: 'auth_vex', stake: 100n });
  const balanceAfterStake = runner.db.player.identity.find(identity)!.balanceCents;
  await runner.reducers.lockMatch({ matchId: ratedId });
  await runner.reducers.startMatch({ matchId: ratedId });
  await runner.reducers.beginReview({ matchId: ratedId });
  await runner.reducers.finalizeMatch({ matchId: ratedId, standings });
  await runner.reducers.revealMatch({ matchId: ratedId, problemSetJson: '{}', salt: 'test' });
  await runner.reducers.settleMatch({ matchId: ratedId, results: [{ marketId: `${ratedId}:winner`, outcome: 'auth_vex' }],
    elo: [{ fighterId: fighter.id, after: 1016 }], stats: [stats] });
  const payout = Object.values(settleMarket([
    { outcome: 'auth_vex', staked: 100, seed: 500 }, { outcome: 'auth_sage', staked: 0, seed: 500 },
  ], [{ id: 'bet', outcome: 'auth_vex', stake: 100 }], 'auth_vex', 500).payouts)[0]!;
  assert.equal(runner.db.player.identity.find(identity)!.balanceCents, balanceAfterStake + BigInt(payout));
  assert.equal(runner.db.fighter.id.find(fighter.id)?.matches, 1);
  assert.equal(runner.db.fighter.id.find(fighter.id)?.elo, 1016);
  assert.equal(runner.db.fighterStats.fighterId.find(fighter.id)?.matches, 1);
  console.log('PASS rated settlement: card updated and integer-cent payout matches shared engine');

  await runner.reducers.createMatch(create('auth_timer', 'mock', true, 50));
  const timerDeadline = Date.now() + 5000;
  while (runner.db.match.id.find('auth_timer')?.status === 'open' && Date.now() < timerDeadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(runner.db.match.id.find('auth_timer')?.status, 'locked');
  await runner.reducers.voidMatch({ matchId: 'auth_timer', reason: 'test complete' });
  console.log('PASS scheduler: timer locks match automatically');
  console.log(`B-06 PASS: ${calls.length} runner-only reducers, claim, scheduler, private views`);
} finally {
  runner.disconnect();
  player.disconnect();
}
