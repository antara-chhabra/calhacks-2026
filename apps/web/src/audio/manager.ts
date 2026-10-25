// Sound manager (FC-F-320, ADR-025). Library-free: every sound is synthesised in synth.ts.
// Pure of React and of the store, so it is testable with a mocked AudioContext.
import type { ArenaCue } from '@fc/engine';
import { SYNTHS, type SoundId } from './synth.js';

export type Priority = 'high' | 'low';
export interface Voice { id: SoundId; pitch?: number }
export interface Env { playing: boolean; speed: number }
export interface AudioDeps {
  env?: () => Env;
  ctxFactory?: () => AudioContext | null;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  coarsePointer?: () => boolean;
  gestureTarget?: EventTarget | null;
  now?: () => number;                                  // ms, for rate limiting
}
export interface Audio {
  start(): void; stop(): void; setMuted(b: boolean): void; muted(): boolean; onCue(cue: ArenaCue): void;
  subscribe(f: () => void): () => void;
}

export const MUTE_KEY = 'fc.audio.muted';
export const MAX_VOICES = 8;
export const MAX_SPEED_LOW = 2;            // above this multiple, low-priority sounds are skipped
export const TICK_GAP_MS = 400;            // think/tool ticks rate limit (scaled by speed)
export const BLIP_GAP_MS = 120;

/** ArenaCue → sounds (PRD §8.6). Returns [] for silent cues. */
export function soundsFor(cue: ArenaCue): Array<{ sound: Voice; priority: Priority }> {
  const H = (id: SoundId, pitch?: number) => ({ sound: { id, pitch }, priority: 'high' as const });
  const L = (id: SoundId, pitch?: number) => ({ sound: { id, pitch }, priority: 'low' as const });
  switch (cue.kind) {
    case 'attack': return [H(cue.power === 'light' ? 'hitLight' : cue.power === 'heavy' ? 'hitHeavy' : 'hitSpecial')];
    case 'whiff': return [L('swing'), H('miss')];
    case 'card': return [H(cue.color === 'red' ? 'red' : 'yellow')];
    case 'var': return [H('var')];
    case 'ko': return [H('ko')];
    case 'victory': return [H('victory')];
    case 'countdown': return [H('beep', 660), H('gong')];
    case 'timeup': return [H('horn')];
    case 'coin': return [H('coin')];
    case 'potion': return [L('potion')];
    case 'think': case 'toolUse': return [L('tick')];
    case 'say': return [L('blip', pitchFor(cue.fighter))];
    case 'dropIn': return [L('blip', pitchFor(cue.fighter))];
    default: return [];
  }
}
/** Stable per-fighter pitch in [0.7, 1.7). */
export function pitchFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 0.7 + (h % 100) / 100;
}

export function createAudio(deps: AudioDeps = {}): Audio {
  const env = deps.env ?? (() => ({ playing: true, speed: 1 }));
  const now = deps.now ?? (() => Date.now());
  const g = globalThis as { AudioContext?: new () => AudioContext; webkitAudioContext?: new () => AudioContext; localStorage?: Storage; matchMedia?: (q: string) => { matches: boolean }; window?: EventTarget };
  const ctxFactory = deps.ctxFactory ?? (() => {
    const C = g.AudioContext ?? g.webkitAudioContext;
    return C ? new C() : null;
  });
  const storage = (() => { try { return deps.storage === undefined ? g.localStorage ?? null : deps.storage; } catch { return null; } })();
  const coarse = deps.coarsePointer ?? (() => { try { return !!g.matchMedia?.('(pointer: coarse)').matches; } catch { return false; } });
  const target = deps.gestureTarget === undefined ? g.window ?? null : deps.gestureTarget;

  let muted = (() => {
    try { const v = storage?.getItem(MUTE_KEY); if (v === '1') return true; if (v === '0') return false; } catch { /* ignore */ }
    return coarse();
  })();
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let started = false;
  let voices = 0;
  const last = new Map<string, number>();
  const subs = new Set<() => void>();
  const GESTURES = ['pointerdown', 'keydown', 'touchstart'];

  const unlock = (): void => {
    if (!ctx) {
      try {
        ctx = ctxFactory();
        if (ctx) { master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination); }
      } catch { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') void ctx.resume?.();
    if (ctx) GESTURES.forEach((e) => target?.removeEventListener(e, unlock));
  };

  const rateOk = (key: string, gap: number): boolean => {
    const t = now(), p = last.get(key);
    if (p !== undefined && t - p < gap) return false;
    last.set(key, t);
    return true;
  };

  const play = (v: Voice): void => {
    if (!ctx || !master || voices >= MAX_VOICES) return;
    try {
      const dur = SYNTHS[v.id](ctx, master, ctx.currentTime + 0.005, { pitch: v.pitch });
      voices++;
      setTimeout(() => { voices = Math.max(0, voices - 1); }, Math.ceil(dur * 1000) + 30);
    } catch { /* never let audio break the UI */ }
  };

  return {
    start() {
      if (started) return;
      started = true;
      GESTURES.forEach((e) => target?.addEventListener(e, unlock));
    },
    stop() {
      started = false;
      GESTURES.forEach((e) => target?.removeEventListener(e, unlock));
      void ctx?.close?.();
      ctx = null; master = null; voices = 0;
    },
    setMuted(b) {
      muted = b;
      try { storage?.setItem(MUTE_KEY, b ? '1' : '0'); } catch { /* ignore */ }
      if (!b && started) unlock();           // the toggle click is itself a user gesture
      subs.forEach((f) => f());
    },
    muted: () => muted,
    subscribe(f) { subs.add(f); return () => { subs.delete(f); }; },
    onCue(cue) {
      if (muted || !started || !ctx) return;
      const e = env();
      if (!e.playing) return;
      for (const { sound, priority } of soundsFor(cue)) {
        if (priority === 'low' && e.speed > MAX_SPEED_LOW) continue;
        if (sound.id === 'tick' && !rateOk('tick', TICK_GAP_MS / Math.max(1, e.speed))) continue;
        if (sound.id === 'blip' && !rateOk('blip', BLIP_GAP_MS / Math.max(1, e.speed))) continue;
        play(sound);
      }
    },
  };
}
