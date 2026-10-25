import { afterEach, describe, expect, it, vi } from 'vitest';
import { isArenaAudioPath } from '../src/audio/route-policy';
import { installAudio } from '../src/audio';
import { emitCue } from '../src/data/store';
import type { Audio } from '../src/audio/manager';

afterEach(() => vi.unstubAllGlobals());

describe('arena audio ownership', () => {
  it('never attaches audio to landing, markets, results, receipts, or mobile betting', () => {
    for (const path of ['/', '/markets', '/markets/code', '/leaderboard', '/forge', '/m', '/match/a/results', '/match/a/receipt']) expect(isArenaAudioPath(path)).toBe(false);
    for (const path of ['/match/live', '/match/a', '/match/a/', '/replay/mock-basic']) expect(isArenaAudioPath(path)).toBe(true);
  });

  it('detaches cues and stops all output when leaving the arena, including repeated entry', () => {
    const a = { start: vi.fn(), stop: vi.fn(), onCue: vi.fn() } as unknown as Audio;
    const off = installAudio(a);
    emitCue({ kind: 'timeup' });
    expect(a.onCue).toHaveBeenCalledTimes(1);
    off();
    emitCue({ kind: 'timeup' });
    expect(a.onCue).toHaveBeenCalledTimes(1);
    expect(a.stop).toHaveBeenCalledOnce();
    const offAgain = installAudio(a);
    emitCue({ kind: 'timeup' });
    expect(a.onCue).toHaveBeenCalledTimes(2);
    offAgain();
  });

  it('suspends hidden browser tabs and removes the visibility handler on exit', () => {
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    vi.stubGlobal('document', doc);
    const a = { start: vi.fn(), stop: vi.fn(), onCue: vi.fn() } as unknown as Audio;
    const off = installAudio(a);
    doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange'));
    expect(a.stop).toHaveBeenCalledOnce();
    doc.visibilityState = 'visible'; doc.dispatchEvent(new Event('visibilitychange'));
    expect(a.start).toHaveBeenCalledTimes(2);
    off();
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(a.start).toHaveBeenCalledTimes(2);
  });
});
