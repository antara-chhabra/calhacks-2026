// Procedural SFX (Web Audio only, no sample files). Each sound schedules nodes at t0 into `out`
// and returns its duration in seconds. Short, punchy, arcade-style.
export type SoundId =
  | 'swing' | 'hitLight' | 'hitHeavy' | 'hitSpecial' | 'miss' | 'yellow' | 'red' | 'var' | 'ko' | 'victory'
  | 'beep' | 'gong' | 'horn' | 'coin' | 'potion' | 'tick' | 'blip';

export type Synth = (ctx: AudioContext, out: AudioNode, t0: number, opt?: { pitch?: number }) => number;

function env(ctx: AudioContext, out: AudioNode, t0: number, peak: number, atk: number, dur: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  g.connect(out);
  return g;
}
function tone(ctx: AudioContext, out: AudioNode, t0: number, type: OscillatorType, f0: number, f1: number, peak: number, dur: number, atk = 0.005): void {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  o.connect(env(ctx, out, t0, peak, atk, dur));
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}
let noiseBuf: AudioBuffer | null = null;
let noiseCtx: AudioContext | null = null;
function noise(ctx: AudioContext, out: AudioNode, t0: number, kind: BiquadFilterType, f0: number, f1: number, q: number, peak: number, dur: number, atk = 0.003): void {
  if (!noiseBuf || noiseCtx !== ctx) {
    const n = Math.floor(ctx.sampleRate * 0.5);
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseCtx = ctx;
  }
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = kind;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  s.connect(f);
  f.connect(env(ctx, out, t0, peak, atk, dur));
  s.start(t0);
  s.stop(t0 + dur + 0.02);
}

const hit = (body: number, crunch: number, dur: number, peak: number): Synth => (c, o, t) => {
  tone(c, o, t, 'sine', body * 2.2, body * 0.6, peak, dur);                 // thump
  noise(c, o, t, 'bandpass', 2400, 600, 1.2, peak * crunch, dur * 0.8);     // crunch
  return dur;
};

export const SYNTHS: Record<SoundId, Synth> = {
  swing: (c, o, t) => { noise(c, o, t, 'bandpass', 600, 3200, 2, 0.28, 0.22, 0.05); return 0.22; },
  hitLight: hit(160, 0.5, 0.14, 0.4),
  hitHeavy: (c, o, t, p) => { hit(110, 0.9, 0.26, 0.6)(c, o, t, p); tone(c, o, t, 'square', 90, 40, 0.18, 0.2); return 0.26; },
  hitSpecial: (c, o, t, p) => {
    hit(90, 1.2, 0.4, 0.7)(c, o, t, p);
    noise(c, o, t + 0.02, 'highpass', 4000, 4000, 0.7, 0.35, 0.3);
    tone(c, o, t + 0.04, 'sawtooth', 880, 220, 0.16, 0.3);
    return 0.4;
  },
  miss: (c, o, t) => { tone(c, o, t, 'sawtooth', 150, 110, 0.22, 0.28); tone(c, o, t, 'square', 75, 55, 0.12, 0.28); return 0.28; },
  yellow: (c, o, t) => { for (let i = 0; i < 2; i++) tone(c, o, t + i * 0.2, 'square', 2900, 2900, 0.16, 0.16); return 0.38; },
  red: (c, o, t) => { for (let i = 0; i < 3; i++) tone(c, o, t + i * 0.17, 'square', 3200, 3200, 0.2, 0.14); tone(c, o, t + 0.55, 'square', 3200, 3200, 0.2, 0.4); return 0.95; },
  var: (c, o, t) => {
    tone(c, o, t, 'sawtooth', 220, 220, 0.18, 0.12); tone(c, o, t + 0.13, 'sawtooth', 330, 330, 0.18, 0.12);
    tone(c, o, t + 0.26, 'sawtooth', 495, 495, 0.2, 0.3); noise(c, o, t + 0.26, 'highpass', 5000, 5000, 0.5, 0.1, 0.3);
    return 0.56;
  },
  ko: (c, o, t) => {
    tone(c, o, t, 'sine', 140, 28, 0.9, 0.9, 0.008);
    noise(c, o, t, 'lowpass', 1800, 80, 0.8, 0.7, 0.8);
    tone(c, o, t, 'square', 70, 30, 0.2, 0.5);
    return 0.9;
  },
  victory: (c, o, t) => {
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => {
      const s = t + i * 0.1;
      const d = i === 5 ? 0.45 : 0.14;
      tone(c, o, s, 'square', f, f, 0.16, d); tone(c, o, s, 'triangle', f / 2, f / 2, 0.18, d);
    });
    return 0.95;
  },
  beep: (c, o, t, p) => { tone(c, o, t, 'square', p?.pitch ?? 880, p?.pitch ?? 880, 0.2, 0.16); return 0.16; },
  gong: (c, o, t) => {
    [196, 293.7, 411, 587, 783].forEach((f, i) => tone(c, o, t, i % 2 ? 'sine' : 'triangle', f, f * 0.995, 0.28 / (1 + i * 0.4), 1.4, 0.004));
    noise(c, o, t, 'bandpass', 3000, 1200, 1, 0.2, 0.2);
    return 1.4;
  },
  horn: (c, o, t) => {
    for (const f of [220, 277, 330]) tone(c, o, t, 'sawtooth', f, f, 0.14, 0.9, 0.04);
    return 0.9;
  },
  coin: (c, o, t) => { tone(c, o, t, 'square', 988, 988, 0.15, 0.08); tone(c, o, t + 0.08, 'square', 1319, 1319, 0.15, 0.35); return 0.43; },
  potion: (c, o, t) => {
    for (let i = 0; i < 4; i++) { const s = t + i * 0.07, f = 320 + i * 140; tone(c, o, s, 'sine', f, f * 1.8, 0.22, 0.09, 0.01); }
    return 0.4;
  },
  tick: (c, o, t) => { tone(c, o, t, 'triangle', 1800, 1500, 0.035, 0.03, 0.002); return 0.03; },
  blip: (c, o, t, p) => { const f = 300 * (p?.pitch ?? 1); tone(c, o, t, 'square', f, f * 1.15, 0.07, 0.07, 0.003); return 0.07; },
};
