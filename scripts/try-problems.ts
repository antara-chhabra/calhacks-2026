// R-01a: print a generated problem set. Usage: tsx scripts/try-problems.ts [seed(32 hex)]
import { randomBytes } from 'node:crypto';
import { generateProblemSet } from '../apps/runner/src/problems/generator.js';

const seed = process.argv[2] ?? randomBytes(16).toString('hex');
const t0 = performance.now();
const set = generateProblemSet(seed);
const ms = performance.now() - t0;
console.log(`seed ${set.seed}  (${ms.toFixed(2)} ms)`);
for (const p of set.problems) {
  console.log(`\n#${p.idx} ${'★'.repeat(p.difficulty)} ${p.points}pts  ${p.family}${p.trap ? '  [TRAP]' : ''}`);
  console.log(`  tex        ${p.statementTex}`);
  console.log(`  integrand  ${p.integrand}`);
  console.log(`  reference  ${p.reference}`);
  console.log(`  live ${JSON.stringify(p.liveDomain)}  final ${JSON.stringify(p.finalDomains)}`);
}
