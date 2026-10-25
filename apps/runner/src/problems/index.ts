// Problem generator and verifier (PRD §8.9, §11.4–11.5). HEAD stub; O4 implements (R-01).
import type { Problem, ProblemSet } from '@fc/contracts';

const NI = (name: string): never => { throw new Error(`not implemented: ${name}`); };
export function generateProblemSet(_seed: string): ProblemSet { return NI('generateProblemSet'); }
export function checkLive(_p: Problem, _answer: string): { ok: boolean; reason?: 'mismatch' | 'invalid_syntax'; detail?: string } { return NI('checkLive'); }
export function checkFinal(_p: Problem, _answer: string): { ok: boolean; passRate: number } { return NI('checkFinal'); }
