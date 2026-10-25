import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ArenaCue } from '@fc/engine';
import type { FighterId } from '@fc/contracts';
import { SequenceDirector, type Beat } from '../src/arena/sequences/director';
import { PODIUM_EVENT, getPodium, setPodium, subscribePodium, type PodiumInfo } from '../src/arena/sequences/podium';
import { INTRO, OUTRO, beamAlpha, confettiAt, koDelay, makeConfetti } from '../src/arena/sequences/pure';
import { CuePlayer, type FighterHandle } from '../src/arena/cues';
import { CLIPS, type PoseDriver } from '../src/arena/clips';

const ids = ['a', 'b', 'c', 'd'] as FighterId[];
const dropIns = ids.map((f, i): ArenaCue => ({ kind: 'dropIn', fighter: f, slot: i as 0, line: `line ${f}` }));
const kos: ArenaCue[] = [{ kind: 'ko', fighter: 'd' as FighterId, order: 1, rank: 4 }, { kind: 'ko', fighter: 'c' as FighterId, order: 2, rank: 3 }, { kind: 'ko', fighter: 'b' as FighterId, order: 3, rank: 2 }];

function rig(reduced = false) {
  const out: { t: number; what: string }[] = [], pods: PodiumInfo[] = [];
  let clock = 0;
  const d = new SequenceDirector({
    reduced: () => reduced,
    emit: (c) => { out.push({ t: clock, what: c.kind + ('fighter' in c ? ':' + c.fighter : '') + (c.kind === 'say' ? ':' + c.text : '') }); },
    onBeat: (b: Beat) => { out.push({ t: clock, what: 'beat:' + b.kind + ('fighter' in b && b.fighter ? ':' + b.fighter : '') }); },
    matchId: () => 'm1', podium: (p) => { pods.push(p); out.push({ t: clock, what: 'podium' }); },
  });
  const run = (ms: number, step = 10): void => { for (let t = 0; t < ms; t += step) { clock += step; d.update(step); } };
  return { d, out, pods, run, names: () => out.map((o) => o.what), at: (w: string) => out.find((o) => o.what === w)?.t };
}

afterEach(() => { setPodium({ revealed: false, winner: null, matchId: null, instant: false }); });

describe('intro', () => {
  it('drop-ins are staggered in slot order, each with its intro line after landing', () => {
    const r = rig();
    dropIns.forEach((c) => { r.d.push(c); });
    expect(r.d.isHidden('a' as FighterId)).toBe(false);   // first drops at once
    expect(r.d.isHidden('b' as FighterId)).toBe(true);
    r.run(4 * INTRO.staggerMs + 1500);
    const order = r.names().filter((n) => n.startsWith('dropIn:'));
    expect(order).toEqual(['dropIn:a', 'dropIn:b', 'dropIn:c', 'dropIn:d']);
    expect(r.at('dropIn:b')! - r.at('dropIn:a')!).toBeGreaterThanOrEqual(INTRO.staggerMs - 10);
    for (const f of ['a', 'b', 'c', 'd']) {
      const n = r.names();
      const iDrop = n.indexOf(`dropIn:${f}`), iLand = n.indexOf(`beat:introLand:${f}`), iSay = n.indexOf(`say:${f}:line ${f}`);
      expect(iDrop).toBeGreaterThanOrEqual(0);
      expect(iDrop).toBeLessThan(iLand);
      expect(iLand).toBeLessThan(iSay);
    }
    expect(r.d.isHidden('d' as FighterId)).toBe(false);
  });
  it('countdown waits for the last landing; gameplay cues wait for FIGHT!', () => {
    const r = rig();
    dropIns.forEach((c) => { r.d.push(c); });
    r.d.push({ kind: 'countdown' });
    r.d.push({ kind: 'think', fighter: 'a' as FighterId });
    r.run(8000);
    expect(r.at('countdown')!).toBeGreaterThanOrEqual(3 * INTRO.staggerMs + INTRO.landMs);
    expect(r.at('think:a')! - r.at('countdown')!).toBeGreaterThanOrEqual(1790);
    expect(r.names().indexOf('dropIn:d')).toBeLessThan(r.names().indexOf('countdown'));
  });
  it('a null intro line adds no bubble', () => {
    const r = rig();
    r.d.push({ kind: 'dropIn', fighter: 'a' as FighterId, slot: 0, line: null });
    r.run(2000);
    expect(r.names().some((n) => n.startsWith('say:'))).toBe(false);
  });
  it('does not advance while the host feeds no time (paused)', () => {
    const r = rig();
    dropIns.forEach((c) => { r.d.push(c); });
    r.run(0);
    expect(r.names().filter((n) => n.startsWith('dropIn:'))).toEqual(['dropIn:a']);
  });
});

describe('outro', () => {
  it('KOs 4→2 in order, then victory, then the podium handoff', () => {
    const r = rig();
    for (const k of [...kos, { kind: 'victory', fighter: 'a' as FighterId } as ArenaCue]) r.d.push(k);
    r.run(9000);
    const n = r.names();
    expect(n.filter((x) => x.startsWith('ko:'))).toEqual(['ko:d', 'ko:c', 'ko:b']);
    expect(r.at('ko:d')).toBeLessThan(r.at('ko:c')!);
    expect(r.at('ko:c')! - r.at('ko:d')!).toBeGreaterThanOrEqual(OUTRO.koGapMs - 10);
    expect(r.at('victory:a')!).toBeGreaterThanOrEqual(koDelay(3, false) + OUTRO.victoryGapMs - 10);
    expect(n.indexOf('ko:b')).toBeLessThan(n.indexOf('victory:a'));
    expect(n.indexOf('beat:victory:a')).toBeGreaterThan(n.indexOf('victory:a'));
    expect(n.indexOf('podium')).toBeGreaterThan(n.indexOf('beat:victory:a'));
    expect(r.at('podium')! - r.at('victory:a')!).toBeGreaterThanOrEqual(OUTRO.podiumDelayMs - 10);
    expect(r.pods).toEqual([{ revealed: true, winner: 'a', matchId: 'm1', instant: false }]);
  });
  it('victory alone is immediate', () => {
    const r = rig();
    r.d.push({ kind: 'victory', fighter: 'a' as FighterId });
    expect(r.names()[0]).toBe('victory:a');
  });
});

describe('podium handoff', () => {
  it('store + window event', () => {
    const seen: PodiumInfo[] = [], ev: PodiumInfo[] = [];
    const target = new EventTarget();
    (globalThis as { window?: unknown }).window = target;
    target.addEventListener(PODIUM_EVENT, (e) => { ev.push((e as CustomEvent<PodiumInfo>).detail); });
    const un = subscribePodium((p) => { seen.push(p); });
    setPodium({ revealed: true, winner: 'a' as FighterId, matchId: 'm', instant: false });
    setPodium({ revealed: true, winner: 'a' as FighterId, matchId: 'm', instant: false });   // no change: no event
    un();
    delete (globalThis as { window?: unknown }).window;
    expect(getPodium().revealed).toBe(true);
    expect(seen).toHaveLength(1);
    expect(ev).toHaveLength(1);
    expect(ev[0]!.winner).toBe('a');
  });
});

describe('reduced motion', () => {
  it('compresses the sequence, no confetti, no spotlight scale, still in order', () => {
    const r = rig(true);
    const beats: Beat[] = [];
    const d2 = new SequenceDirector({ reduced: () => true, emit: () => undefined, onBeat: (b) => { beats.push(b); }, podium: () => undefined });
    for (const k of [...kos, { kind: 'victory', fighter: 'a' as FighterId } as ArenaCue]) { r.d.push(k); d2.push(k); }
    r.run(4000); d2.update(4000);
    expect(beats.find((b) => b.kind === 'victory')).toEqual({ kind: 'victory', fighter: 'a', confetti: false });
    expect(r.at('victory:a')! - r.at('ko:d')!).toBeLessThan(1500);
    expect(r.at('podium')).toBeLessThan(4000);
    expect(r.names().filter((n) => n.startsWith('ko:'))).toEqual(['ko:d', 'ko:c', 'ko:b']);
  });
  it('confetti is empty and the beam only fades', () => {
    expect(makeConfetti(100, 1, [1, 2], true)).toEqual([]);
    expect(makeConfetti(100, 1, [1, 2], false)).toHaveLength(100);
    expect(beamAlpha(60, 800, true)).toBeCloseTo(0.5, 5);
    expect(beamAlpha(400, 800, true)).toBe(1);
    expect(beamAlpha(790, 800, true)).toBeLessThan(0.2);
  });
  it('confetti is deterministic and ends', () => {
    const a = makeConfetti(10, 7, [1, 2, 3], false), b = makeConfetti(10, 7, [1, 2, 3], false);
    expect(a).toEqual(b);
    expect(confettiAt(a[0]!, 0)).toBeNull();
    expect(confettiAt(a[0]!, a[0]!.delay + 300)).not.toBeNull();
    expect(confettiAt(a[0]!, OUTRO.confettiMs + 1000)).toBeNull();
  });
  it('dropIn becomes a fade, koBlast a crossfade that stays at the slot', () => {
    const ref = (w: number, face = 'neutral') => ({ bones: { torso: 0 }, weapon: w, face });
    const mk = () => ({ state: { x: 0, y: 0, rot: 0, sx: 1, sy: 1, alpha: 1, grounded: true, weapon: 0, bones: { torso: 0 }, face: 'neutral' }, base: ref(0), poses: { attack: ref(5), ko: ref(-60, 'ko'), victory: ref(8) }, setFacing: vi.fn(), flush: vi.fn() }) as unknown as PoseDriver;
    const d = mk(), tl = CLIPS.dropIn(d, { reduced: true });
    tl.progress(0.01);
    expect(d.state.y).toBe(0);
    expect(d.state.alpha).toBeLessThan(1);
    tl.progress(1);
    expect(d.state.alpha).toBe(1);
    expect(d.state.sy).toBe(1);
    const k = mk(); CLIPS.koBlast(k, { reduced: true }).progress(1);
    expect(k.state.x).toBe(0);
    expect(k.state.y).toBe(0);
    expect(k.state.rot).toBe(0);
    expect(k.state.alpha).toBeLessThan(1);
    expect(k.state.alpha).toBeGreaterThan(0);
    expect(k.state.face).toBe('ko');
  });
});

describe('snap (catch-up) skips sequences', () => {
  it('drops pending intro steps, unhides fighters, and does not replay', () => {
    const r = rig();
    dropIns.forEach((c) => { r.d.push(c); });
    r.d.push({ kind: 'countdown' });
    r.run(300);
    r.d.snap(null);
    expect(r.d.pending).toBe(0);
    expect([...ids].some((i) => r.d.isHidden(i))).toBe(false);
    const before = r.out.length;
    r.run(10000);
    expect(r.out.slice(before).map((o) => o.what)).toEqual([]);
    expect(r.out.some((o) => o.what === 'beat:clear')).toBe(true);
    expect(getPodium()).toBeDefined();
  });
  it('snap into an ended match shows the end state and reveals the podium instantly', () => {
    const r = rig();
    for (const k of [...kos, { kind: 'victory', fighter: 'a' as FighterId } as ArenaCue]) r.d.push(k);
    r.run(100);
    r.d.snap({ winner: 'a' as FighterId, matchId: 'm1' });
    expect(r.d.pending).toBe(0);
    r.run(10000);
    const n = r.names();
    expect(n.filter((x) => x === 'victory:a' || x.startsWith('ko:b'))).toEqual([]);
    expect(n.filter((x) => x === 'podium')).toHaveLength(1);   // only the instant reveal from the snap itself
    expect(n).toContain('beat:ended:a');
    expect(r.pods.at(-1)).toEqual({ revealed: true, winner: 'a', matchId: 'm1', instant: true });
  });
  it('snap before the end resets the podium', () => {
    const r = rig();
    r.d.snap({ winner: 'a' as FighterId, matchId: 'm1' });
    r.d.snap(null);
    expect(r.pods.at(-1)!.revealed).toBe(false);
  });
  it('intro stagger restarts for a new group after a snap', () => {
    const r = rig();
    r.d.snap(null);
    dropIns.forEach((c) => { r.d.push(c); });
    expect(r.d.isHidden('a' as FighterId)).toBe(false);
    expect(r.d.isHidden('b' as FighterId)).toBe(true);
  });
});

describe('player: reduced KO end state matches the snap pose', () => {
  it('applyKo fades in reduced motion', () => {
    const d = (() => { const ref = (w: number, face = 'neutral') => ({ bones: { torso: 0 }, weapon: w, face }); return { state: { x: 0, y: 0, rot: 0, sx: 1, sy: 1, alpha: 1, grounded: true, weapon: 0, bones: { torso: 0 }, face: 'neutral' }, base: ref(0), poses: { attack: ref(5), ko: ref(-60, 'ko'), victory: ref(8) }, setFacing: vi.fn(), flush: vi.fn() } as unknown as PoseDriver; })();
    const p = new CuePlayer({ speed: () => 1, playing: () => true, reduced: () => true, fighterState: () => ({ status: 'ko', damagePct: 0 }) });
    p.setFighters([{ id: 'a' as FighterId, slot: { x: 1, y: 2, facing: 1 }, driver: d, place: vi.fn() } as FighterHandle]);
    expect(d.state.alpha).toBeLessThan(1);
    expect(d.state.face).toBe('ko');
  });
});
