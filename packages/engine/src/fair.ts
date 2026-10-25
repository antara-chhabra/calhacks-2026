// Commit-reveal (PRD §8.3, FC-F-081). K-04.
import type { ProblemSet } from '@fc/contracts';

const NI = (name: string): never => { throw new Error(`not implemented: ${name}`); };
export function canonicalJson(_x: unknown): string { return NI('canonicalJson'); }
export async function commitHash(_set: ProblemSet, _saltHex: string): Promise<string> { return NI('commitHash'); }
export async function verifyReveal(_commit: string, _set: ProblemSet, _saltHex: string): Promise<boolean> { return NI('verifyReveal'); }
