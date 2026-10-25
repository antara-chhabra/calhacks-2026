// Commit-reveal (PRD §8.3, FC-F-081). K-04. Works in browsers and Node 22+ via globalThis.crypto.subtle.
import type { ProblemSet } from '@fc/contracts';

/** Sorted keys (recursive), no whitespace, numbers/strings via JSON.stringify. undefined object values are skipped; undefined array items become null (as JSON.stringify). */
export function canonicalJson(x: unknown): string {
  if (x === null || typeof x !== 'object') return JSON.stringify(x) ?? 'null';
  if (Array.isArray(x)) return '[' + x.map((v) => (v === undefined ? 'null' : canonicalJson(v))).join(',') + ']';
  const o = x as Record<string, unknown>;
  const parts: string[] = [];
  for (const k of Object.keys(o).sort()) {
    if (o[k] === undefined || typeof o[k] === 'function') continue;
    parts.push(JSON.stringify(k) + ':' + canonicalJson(o[k]));
  }
  return '{' + parts.join(',') + '}';
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  let hex = '';
  for (const b of new Uint8Array(buf)) hex += b.toString(16).padStart(2, '0');
  return hex;
}

export async function commitHash(set: ProblemSet, saltHex: string): Promise<string> {
  return sha256Hex(canonicalJson(set) + ':' + saltHex);
}

export async function verifyReveal(commit: string, set: ProblemSet, saltHex: string): Promise<boolean> {
  return (await commitHash(set, saltHex)) === commit.toLowerCase();
}
