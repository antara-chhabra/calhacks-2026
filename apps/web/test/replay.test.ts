import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArenaCue } from '@fc/engine';
import { restartReplay, seekReplay, stopReplay, useStore } from '../src/data/store';
import { loadFixture } from '../src/data/replay';

const flush = async () => { await vi.advanceTimersByTimeAsync(0); await Promise.resolve(); };
let cues: ArenaCue[];
let off: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  cues = [];
  off = useStore.getState().cues$((c) => cues.push(c));
});
afterEach(() => { off(); stopReplay(); vi.useRealTimers(); });

describe('replay of mock-basic', () => {
  it('plays to settled with the fixture standings, emitting a var cue', async () => {
    const fx = await loadFixture('mock-basic');
    useStore.getState().openReplay('mock-basic', 1);
    await flush();
    expect(useStore.getState().conn).toBe('replay');
    expect(Object.keys(useStore.getState().fighters)).toHaveLength(4);
    await vi.advanceTimersByTimeAsync(fx.events[fx.events.length - 1]!.t + 1000);
    const { watch, markets, bets } = useStore.getState();
    expect(watch.state.status).toBe('settled');
    expect(watch.state.standings).toEqual(fx.expected.standings);
    expect(watch.state.lastSeq).toBe(fx.events[fx.events.length - 1]!.seq);
    expect(cues.some((c) => c.kind === 'var')).toBe(true);
    expect(Object.values(markets).every((m) => m.status === 'settled' && m.result)).toBe(true);
    expect(bets.find((b) => b.id === 'b1')).toMatchObject({ status: 'won', payout: 6566 });
  });

  it('seek is silent catch-up and bumps playbackRevision', async () => {
    const fx = await loadFixture('mock-basic');
    useStore.getState().openReplay('mock-basic', 1);
    await flush();
    await vi.advanceTimersByTimeAsync(10_000);
    cues.length = 0;
    const rev = useStore.getState().watch.playbackRevision;
    seekReplay(100_000);
    expect(cues).toHaveLength(0);
    const w = useStore.getState().watch;
    expect(w.playbackRevision).toBe(rev + 1);
    expect(w.state.t).toBeGreaterThan(90_000);
    expect(w.state.t).toBeLessThanOrEqual(100_000);
    expect(w.state.status).not.toBe('settled');
    restartReplay();
    expect(useStore.getState().watch.state.lastSeq).toBe(0);
    expect(fx.events.length).toBeGreaterThan(100);
  });

  it('pause stops progress; speed 10 finishes in a tenth of the time', async () => {
    useStore.getState().openReplay('mock-basic', 10);
    await flush();
    useStore.getState().setPlaying(false);
    const seq = useStore.getState().watch.state.lastSeq;
    await vi.advanceTimersByTimeAsync(5000);
    expect(useStore.getState().watch.state.lastSeq).toBe(seq);
    useStore.getState().setPlaying(true);
    await vi.advanceTimersByTimeAsync(14_500);   // ~145 s of fixture time at 10x
    expect(useStore.getState().watch.state.status).toBe('settled');
  });
});
