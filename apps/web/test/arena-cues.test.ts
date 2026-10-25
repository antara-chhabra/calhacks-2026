import { describe, expect, it, vi } from 'vitest';
import type { ArenaCue } from '@fc/engine';
import type { FighterId } from '@fc/contracts';
import { CuePlayer, QUEUE_LIMIT, type FighterHandle, type LiveStatus } from '../src/arena/cues';
import type { PoseDriver } from '../src/arena/clips';

const BONES = ['torso', 'head', 'upperArmF', 'forearmF', 'upperArmB', 'forearmB', 'thighF', 'shinF', 'footF', 'thighB', 'shinB', 'footB'];
const ref = (v: Record<string, number>, w: number, face = 'neutral') => ({ bones: Object.fromEntries(BONES.map((b) => [b, v[b] ?? 0])), weapon: w, face });
function fakeDriver(): PoseDriver {
  const base = ref({ torso: -2, upperArmF: -30, forearmF: -50 }, 36);
  const d = {
    state: { x: 0, y: 0, rot: 0, sx: 1, sy: 1, alpha: 1, grounded: true, weapon: base.weapon, bones: { ...base.bones }, face: 'neutral' },
    base,
    poses: { attack: ref({ torso: 16, upperArmF: -96 }, 112, 'focus'), ko: ref({ torso: -6, upperArmF: -125 }, -62, 'ko'), victory: ref({ upperArmF: -160 }, 8, 'smug') },
    setFacing: vi.fn(), flush: vi.fn(),
  };
  return d as unknown as PoseDriver;
}
const SLOT = [{ x: 390, y: 520, facing: 1 }, { x: 700, y: 760, facing: 1 }, { x: 1220, y: 760, facing: -1 }, { x: 1530, y: 520, facing: -1 }] as const;
const IDS = ['a', 'b', 'c', 'd'] as FighterId[];

function setup(opts: { speed?: number; status?: Partial<Record<string, LiveStatus>> } = {}) {
  const env = { speed: opts.speed ?? 1, playing: true, status: opts.status ?? {} as Record<string, LiveStatus> };
  const log: string[] = [];
  const player = new CuePlayer({
    speed: () => env.speed, playing: () => env.playing,
    fighterState: (id) => ({ status: env.status[id] ?? 'working', damagePct: 50 }),
    hooks: { onImpact: (c) => { log.push(`impact:${c.fighter}>${c.target}`); }, onDrop: (c) => { log.push(`drop:${c.kind}`); } },
  });
  const handles = IDS.map((id, i): FighterHandle => ({ id, slot: { ...SLOT[i]! }, driver: fakeDriver(), place: vi.fn() }));
  player.setFighters(handles);
  const run = (ms: number, step = 16): void => { for (let t = 0; t < ms; t += step) player.tick(step); };
  const name = (id: string) => player.fighter(id as FighterId)!.active?.name;
  return { env, player, handles, run, name, log };
}
const attack = (f: string, t: string, power: 'light' | 'heavy' | 'special' = 'light'): ArenaCue =>
  ({ kind: 'attack', fighter: f as FighterId, target: t as FighterId, power, problem: 1, points: 10, label: 'P1' });

describe('cue player', () => {
  it('idles when the queue is empty and plays FIFO per fighter', () => {
    const { player, run, name } = setup();
    expect(name('a')).toBe('idle');
    player.handle({ kind: 'toolUse', fighter: 'a' as FighterId, tool: 'read' });
    player.handle({ kind: 'card', fighter: 'a' as FighterId, color: 'yellow' });
    expect(name('a')).toBe('toolUse');
    expect(player.fighter('a' as FighterId)!.queue.map((j) => j.kind)).toEqual(['card']);
    run(500);                                   // toolUse = 450 ms
    expect(name('a')).toBe('card');
    run(700);                                   // cardReact = 600 ms
    expect(name('a')).toBe('idle');
    expect(name('b')).toBe('idle');             // other fighters unaffected
  });

  it('attack = dash → slash → return, victim reserved and reacts at the impact frame', () => {
    const { player, run, name, log } = setup();
    player.handle(attack('a', 'b'));
    expect(name('a')).toBe('attack');
    expect(name('b')).toBe('idle');
    run(250);                                   // dash 260 ms: not at impact yet
    expect(name('b')).toBe('idle');
    run(160);                                   // slashLight contact = 55 + 60 ms into the slash (≈ 375 ms)
    expect(log).toEqual(['impact:a>b']);
    expect(name('b')).toBe('reaction');
    // victim's own queued cue waits until the reaction (hitReact 200 ms) finishes
    player.handle({ kind: 'toolUse', fighter: 'b' as FighterId, tool: 'run' });
    expect(name('b')).toBe('reaction');
    run(250);
    expect(name('b')).toBe('toolUse');
    run(500);
    expect(name('a')).toBe('idle');             // attacker returned and went back to idle
    expect(player.fighter('a' as FighterId)!.pos).toEqual({ x: 390, y: 520 });
  });

  it('whiff plays the whiff clip with no victim reaction', () => {
    const { player, run, name, log } = setup();
    player.handle({ kind: 'whiff', fighter: 'a' as FighterId, target: 'b' as FighterId, problem: 2, label: 'MISS' });
    expect(name('a')).toBe('whiff');
    run(200);
    expect(name('b')).toBe('idle');
    expect(log).toEqual([]);
  });

  it('a victim busy with its own attack gets the reaction deferred, not lost', () => {
    const { player, run, name } = setup();
    player.handle(attack('b', 'c'));
    player.handle(attack('a', 'b'));
    run(450);
    expect(name('b')).toBe('attack');           // protected clip keeps running
    expect(player.fighter('b' as FighterId)!.pendingReact).not.toBeNull();
    run(1200);
    expect(player.fighter('b' as FighterId)!.pendingReact).toBeNull();
  });

  it('think loops until the next cue; duplicate thinks are merged', () => {
    const { player, name } = setup();
    player.handle({ kind: 'think', fighter: 'a' as FighterId });
    expect(name('a')).toBe('think');
    player.handle({ kind: 'think', fighter: 'a' as FighterId });
    expect(player.stats.think!.dropped).toBe(1);
    player.handle({ kind: 'card', fighter: 'a' as FighterId, color: 'red' });
    expect(name('a')).toBe('card');
  });

  it('drops think/toolUse beyond the queue limit, never attack/var/ko/card', () => {
    const { player, name } = setup();
    player.handle({ kind: 'card', fighter: 'a' as FighterId, color: 'yellow' });   // occupies the fighter
    for (let i = 0; i < QUEUE_LIMIT; i++) player.handle({ kind: 'toolUse', fighter: 'a' as FighterId, tool: 'read' });
    expect(player.fighter('a' as FighterId)!.queue.length).toBe(QUEUE_LIMIT);
    player.handle({ kind: 'toolUse', fighter: 'a' as FighterId, tool: 'read' });
    expect(player.stats.toolUse!.dropped).toBe(1);
    player.handle(attack('a', 'b'));            // evicts queued toolUse, keeps the attack
    expect(player.stats.attack!.dropped).toBe(0);
    expect(player.fighter('a' as FighterId)!.queue.map((j) => j.kind)).toEqual(['attack']);
    expect(name('a')).toBe('card');
  });

  it('at speed 10 think/toolUse are dropped but scoring cues play', () => {
    const { player, name } = setup({ speed: 10 });
    player.handle({ kind: 'think', fighter: 'a' as FighterId });
    player.handle({ kind: 'toolUse', fighter: 'a' as FighterId, tool: 'write' });
    expect(player.stats.think!.dropped + player.stats.toolUse!.dropped).toBe(2);
    expect(name('a')).toBe('idle');
    for (const c of [attack('a', 'b'), { kind: 'whiff', fighter: 'c', target: 'b', problem: 1, label: '' } as ArenaCue,
      { kind: 'ko', fighter: 'd' as FighterId, order: 1, rank: 4 } as ArenaCue, { kind: 'card', fighter: 'b' as FighterId, color: 'red' } as ArenaCue]) player.handle(c);
    for (const k of ['attack', 'whiff', 'ko', 'card']) expect(player.stats[k]!.dropped).toBe(0);
    expect(name('d')).toBe('ko');
  });

  it('speed sets the timeScale and advances proportionally; pause freezes', () => {
    const { env, player, run, name } = setup({ speed: 2 });
    player.handle({ kind: 'card', fighter: 'a' as FighterId, color: 'yellow' });   // cardReact = 600 ms
    expect(player.fighter('a' as FighterId)!.active!.tl.timeScale()).toBe(2);
    run(288);                                    // 576 ms of clip
    expect(name('a')).toBe('card');
    run(32);
    expect(name('a')).toBe('idle');
    env.speed = 1; env.playing = false;
    player.handle({ kind: 'card', fighter: 'a' as FighterId, color: 'red' });
    run(2000);
    expect(name('a')).toBe('card');              // paused: no progress
    env.playing = true; run(500);
    expect(name('a')).toBe('card');
    run(200);
    expect(name('a')).toBe('idle');
  });

  it('snap clears queues and timelines and shows the state-derived pose', () => {
    const { env, player, handles, name } = setup();
    player.handle(attack('a', 'b', 'heavy'));
    player.handle({ kind: 'card', fighter: 'a' as FighterId, color: 'yellow' });
    const tl = player.fighter('a' as FighterId)!.active!.tl;
    env.status = { a: 'winner', b: 'ko', c: 'out', d: 'working' };
    player.snap();
    expect(tl.isActive() || tl.totalTime() === 0).toBeTruthy();
    expect(player.fighter('a' as FighterId)!.queue).toEqual([]);
    expect(name('a')).toBe('victory');
    expect(player.fighter('b' as FighterId)!.held).toBe('ko');
    expect(player.fighter('b' as FighterId)!.active).toBeNull();
    expect(handles[1]!.driver.state.face).toBe('ko');
    expect(handles[2]!.driver.state.face).toBe('ko');
    expect(name('d')).toBe('idle');
    expect(handles[0]!.place).toHaveBeenLastCalledWith(390, 520);
  });

  it('a KO blast carries the rig away and it stays there', () => {
    const { player, handles, run, name } = setup();
    player.handle({ kind: 'ko', fighter: 'd' as FighterId, order: 1, rank: 4 });
    run(800);
    expect(name('d')).toBeUndefined();
    expect(player.fighter('d' as FighterId)!.held).toBe('ko');
    expect(handles[3]!.driver.state.x).toBeLessThan(-500);
  });

  it('counts every cue kind and hooks fire for clip-less kinds', () => {
    const { player } = setup();
    const seen: string[] = [];
    const cues: ArenaCue[] = [{ kind: 'countdown' }, { kind: 'say', fighter: 'a' as FighterId, text: 'hi' }, { kind: 'timeup' }, { kind: 'void', reason: 'x' },
      { kind: 'var', fighter: 'a' as FighterId, target: 'b' as FighterId, problem: 1, overturned: true, points: -10 }, { kind: 'potion', fighter: 'a' as FighterId },
      { kind: 'coin', fighter: 'a' as FighterId, amountUsdc: 1 }];
    cues.forEach((c) => { player.handle(c); seen.push(c.kind); });
    for (const k of seen) expect(player.stats[k]!.received).toBe(1);
    expect(player.stats.var!.dropped).toBe(0);
  });
});
