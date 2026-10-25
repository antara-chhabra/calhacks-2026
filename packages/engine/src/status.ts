// "SAGE leads 60–40 · 0:47 left · 2 of 5 solved" (PRD §8.6). K-03.
import type { MatchState } from './state.js';

const NI = (name: string): never => { throw new Error(`not implemented: ${name}`); };
export function statusLine(_s: MatchState): string { return NI('statusLine'); }
