import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import type { FighterBackend } from './types.js';

/** Conservative global-unicast check; reject IPv4-mapped IPv6 and transition ranges. */
export function publicAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b, c] = ip.split('.').map(Number);
    return a > 0 && a < 224 && a !== 10 && a !== 127
      && !(a === 100 && b >= 64 && b <= 127) && !(a === 169 && b === 254)
      && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && (b === 168 || b === 0 || b === 88 && c === 99))
      && !(a === 198 && (b === 18 || b === 19 || b === 51 && c === 100)) && !(a === 203 && b === 0 && c === 113);
  }
  if (isIP(ip) === 6) {
    const head = parseInt(ip.split(':')[0]!, 16);
    return head >= 0x2000 && head <= 0x3fff && !/^2001:(?:0*:|0*db8:)/i.test(ip) && !/^2002:/i.test(ip);
  }
  return false;
}

type Transport = { lookup?: typeof lookup; request?: typeof request };
export async function postByo(endpoint: string, body: object, signal: AbortSignal, transport: Transport = {}): Promise<void> {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('Invalid BYO endpoint.');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await (transport.lookup ?? lookup)(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address))) throw new Error('BYO endpoint must resolve to public addresses.');
  signal.throwIfAborted();
  const selected = addresses[0]!;
  const payload = JSON.stringify(body);
  await new Promise<void>((resolve, reject) => {
    const req = (transport.request ?? request)(url, {
      method: 'POST', signal, headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) },
      family: selected.family,
      // Pin the validated DNS result, preserving URL hostname for TLS validation.
      lookup: ((_name: string, _options: unknown, cb: (err: Error | null, address: string, family: number) => void) => cb(null, selected.address, selected.family)) as never,
    }, (res) => {
      let size = 0;
      res.on('data', (chunk: Buffer) => { size += chunk.length; if (size > 65_536) res.destroy(new Error('BYO response too large.')); });
      res.on('error', reject);
      res.on('end', () => res.statusCode === 202 ? resolve() : reject(new Error('BYO endpoint must accept with 202.')));
    });
    req.on('error', reject); req.end(payload);
  });
}

export function createHttpBackend(): FighterBackend {
  return {
    engine: 'http',
    async run(input, io, signal) {
      if (!input.endpointUrl || !input.submitUrl || !input.token) return { ok: false, turns: 0, usage: null, error: { code: 'crash', message: 'BYO configuration is incomplete.' } };
      const ctrl = new AbortController();
      const abort = () => ctrl.abort();
      const timeout = setTimeout(abort, 3000);
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) ctrl.abort();
      try {
        const deadline = Math.min(input.deadlineAt, Date.now() + io.remainingMs());
        const send = postByo(input.endpointUrl, {
          protocol: 'fightcard/1', matchId: input.matchId, fighterId: input.fighter.id, token: input.token,
          problems: input.problems, deadlineAt: deadline, submitUrl: input.submitUrl,
          sayUrl: input.submitUrl.replace(/\/submit$/, '/say'),
          rules: 'Submit mathjs antiderivatives. Maximum 3 attempts per problem, 20 submissions per minute. Wrong answers cost 5 points. Taunts: 80 characters, maximum 3. Final review checks the full domain.',
        }, ctrl.signal);
        // Cover DNS as well as TLS/response time; postByo checks abort before any request.
        await Promise.race([send, new Promise<never>((_, reject) => {
          if (ctrl.signal.aborted) reject(new Error('aborted'));
          else ctrl.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        })]);
        clearTimeout(timeout);
        await new Promise<void>((resolve) => {
          if (signal.aborted || io.isOut()) return resolve();
          const timer = setTimeout(done, Math.max(0, deadline - Date.now()));
          function done() { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(); }
          signal.addEventListener('abort', done, { once: true });
        });
        return { ok: true, turns: 1, usage: null, error: null };
      } catch {
        return { ok: false, turns: 0, usage: null, error: { code: signal.aborted ? 'timeout' : 'crash', message: 'BYO fighter could not accept the match.' } };
      } finally { clearTimeout(timeout); signal.removeEventListener('abort', abort); }
    },
  };
}
