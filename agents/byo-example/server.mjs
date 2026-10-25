// Run: node agents/byo-example/server.mjs; expose port 9010 through an HTTPS tunnel.
// Register that HTTPS URL in Forge. Tokens stay in memory and are never logged.
import { createServer } from 'node:http';
import { derivative, parse, simplify } from 'mathjs';
const runnerOrigin = process.env.FC_BYO_RUNNER_ORIGIN;
if (!runnerOrigin || new URL(runnerOrigin).protocol !== 'https:') throw new Error('Set FC_BYO_RUNNER_ORIGIN to the public HTTPS runner origin.');

async function fight(match) {
  for (const problem of match.problems) {
    if (Date.now() >= match.deadlineAt) break;
    // Tiny polynomial solver: replace this function with your own agent runtime.
    try {
      const node = parse(problem.integrand);
      const terms = node.toString().split(/(?=[+-])/);
      const answer = terms.map((term) => {
        const m = term.replace(/\s/g, '').match(/^([+-]?\d+(?:\.\d+)?)\*?x(?:\^(\d+))?$/);
        if (m) return `(${Number(m[1]) / (Number(m[2] ?? 1) + 1)})*x^${Number(m[2] ?? 1) + 1}`;
        if (/^[+-]?\d+(?:\.\d+)?$/.test(term.trim())) return `(${term})*x`;
        throw new Error('unsupported');
      }).join('+');
      if (simplify(`${derivative(answer, 'x')} - (${problem.integrand})`).toString() !== '0') continue;
      await fetch(match.submitUrl, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: match.token, fighterId: match.fighterId, problem: problem.idx, antiderivative: answer }), signal: AbortSignal.timeout(2000) });
    } catch { /* Unsupported integrals are left for a stronger solver. */ }
  }
}

createServer(async (req, res) => {
  if (req.method !== 'POST') { res.writeHead(405).end(); return; }
  try {
    let body = '';
    for await (const part of req) { body += part; if (body.length > 65_536) throw new Error('too large'); }
    const match = JSON.parse(body);
    if (match.protocol !== 'fightcard/1' || !Array.isArray(match.problems)) throw new Error('protocol');
    const callback = new URL(match.submitUrl);
    if (callback.protocol !== 'https:' || callback.origin !== new URL(runnerOrigin).origin) throw new Error('untrusted runner');
    res.writeHead(202).end();
    void fight(match).catch(() => undefined);
  } catch { res.writeHead(400).end(); }
}).listen(9010, '127.0.0.1', () => console.log('BYO example listening on port 9010; expose using HTTPS.'));
