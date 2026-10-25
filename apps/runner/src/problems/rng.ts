// Seeded PRNG for the problem generator (FC-F-020). sfc32 seeded from a 32-hex-char seed. No Math.random.
export type Rng = {
  /** float in [0,1) */ next(): number;
  /** integer in [lo, hi] inclusive */ int(lo: number, hi: number): number;
  /** nonzero integer with |v| in [lo, hi] and random sign */ signed(lo: number, hi: number): number;
  pick<T>(xs: readonly T[]): T;
};

export function createRng(seed: string): Rng {
  if (!/^[0-9a-f]{32}$/.test(seed)) throw new Error('seed must be 32 lowercase hex characters');
  let a = parseInt(seed.slice(0, 8), 16) >>> 0;
  let b = parseInt(seed.slice(8, 16), 16) >>> 0;
  let c = parseInt(seed.slice(16, 24), 16) >>> 0;
  let d = parseInt(seed.slice(24, 32), 16) >>> 0;
  const raw = (): number => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 15; i++) raw();
  const next = raw;
  const int = (lo: number, hi: number): number => lo + Math.floor(next() * (hi - lo + 1));
  return {
    next, int,
    signed: (lo, hi) => (next() < 0.5 ? -1 : 1) * int(lo, hi),
    pick: (xs) => xs[Math.floor(next() * xs.length)] as (typeof xs)[number],
  };
}
