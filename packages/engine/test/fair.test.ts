import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { ProblemSet } from '@fc/contracts';
import { canonicalJson, commitHash, verifyReveal } from '../src/fair.js';

const set: ProblemSet = {
  category: 'integrals', seed: '00112233445566778899aabbccddeeff',
  problems: [{ idx: 1, difficulty: 1, points: 10, family: 'poly', statementTex: '\\int x\\,dx', integrand: 'x', liveDomain: [0, 1], finalDomains: [[0, 1], [2, 3]], reference: 'x^2/2', trap: false }],
};
const salt = 'deadbeefcafebabe0123456789abcdef';

describe('canonicalJson', () => {
  it('sorts keys recursively, no whitespace', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: 'x' } })).toBe('{"a":{"c":"x","d":[3,{"y":2,"z":1}]},"b":1}');
  });
  it('is insensitive to key order', () => { expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 })); });
  it('numbers, null, strings and skipped undefined', () => {
    expect(canonicalJson({ n: 1.5, z: null, s: 'a"b', u: undefined })).toBe('{"n":1.5,"s":"a\\"b","z":null}');
    expect(canonicalJson([1, undefined])).toBe('[1,null]');
  });
});

describe('commitHash', () => {
  it('known vector (independent node:crypto)', async () => {
    const expected = createHash('sha256').update(canonicalJson(set) + ':' + salt).digest('hex');
    expect(await commitHash(set, salt)).toBe(expected);
    expect(expected).toMatch(/^[0-9a-f]{64}$/);
  });
  it('pins a literal canonical string vector', async () => {
    const lit = '{"category":"integrals","problems":[{"difficulty":1,"family":"poly","finalDomains":[[0,1],[2,3]],"idx":1,"integrand":"x","liveDomain":[0,1],"points":10,"reference":"x^2/2","statementTex":"\\\\int x\\\\,dx","trap":false}],"seed":"00112233445566778899aabbccddeeff"}';
    expect(canonicalJson(set)).toBe(lit);
    expect(await commitHash(set, salt)).toBe(createHash('sha256').update(lit + ':' + salt).digest('hex'));
  });
  it('verifyReveal accepts the right reveal, rejects tampering', async () => {
    const h = await commitHash(set, salt);
    expect(await verifyReveal(h, set, salt)).toBe(true);
    expect(await verifyReveal(h, set, salt + '0')).toBe(false);
    expect(await verifyReveal(h, { ...set, seed: 'f'.repeat(32) }, salt)).toBe(false);
  });
});
