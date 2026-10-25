import { describe, expect, it, vi } from 'vitest';
import { AdminError, createAdminClient, loadToken, parseTokenFromHash } from '../src/ui/director/client';
import { basescanUrl, buildReceipt, isTxHash } from '../src/ui/receipt/model';
import fx from '../../../fixtures/matches/mock-basic.json';

const res = (status: number, body?: unknown) => ({ status, ok: status >= 200 && status < 300, json: async () => body }) as Response;

describe('admin client', () => {
  it('sends Bearer auth and JSON bodies to the right paths', async () => {
    const f = vi.fn(async () => res(201, { matchId: 'm1' }));
    const c = createAdminClient('http://x:1/', 'tok123', f as unknown as typeof fetch);
    expect(await c.createMatch({ fighters: ['vex', 'pip'], betWindowS: 20 })).toEqual({ matchId: 'm1' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://x:1/admin/matches');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok123');
    expect(JSON.parse(init.body as string)).toEqual({ fighters: ['vex', 'pip'], betWindowS: 20 });
  });
  it('handles 204 and builds action paths', async () => {
    const f = vi.fn(async () => res(204));
    const c = createAdminClient('http://x:1', 't', f as unknown as typeof fetch);
    await expect(c.hold('a/b', 30)).resolves.toBeUndefined();
    expect(f.mock.calls[0]![0]).toBe('http://x:1/admin/matches/a%2Fb/hold');
  });
  it('maps error codes to messages', async () => {
    const c = createAdminClient('http://x', 't', (async () => res(409, { error: { code: 'match_active', message: 'raw' } })) as unknown as typeof fetch);
    const e = await c.createMatch().catch((x) => x as AdminError);
    expect(e).toBeInstanceOf(AdminError);
    expect(e.code).toBe('match_active'); expect(e.message).toMatch(/already running/);
    const u = createAdminClient('http://x', 't', (async () => res(401, { error: { code: 'unauthorized', message: 'm' } })) as unknown as typeof fetch);
    expect((await u.health().catch((x) => x as AdminError)).unauthorized).toBe(true);
  });
  it('reports unreachable on network failure', async () => {
    const c = createAdminClient('http://x', 't', (async () => { throw new TypeError('failed'); }) as unknown as typeof fetch);
    expect((await c.health().catch((x) => x as AdminError)).unreachable).toBe(true);
  });
});

describe('token parsing', () => {
  it('reads token from hash only', () => {
    expect(parseTokenFromHash('#token=abc123')).toBe('abc123');
    expect(parseTokenFromHash('#x=1&token=a%2Bb')).toBe('a+b');
    expect(parseTokenFromHash('')).toBeNull();
    expect(parseTokenFromHash('#token=')).toBeNull();
  });
  it('persists to and falls back on storage', () => {
    const m = new Map<string, string>();
    const store = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
    expect(loadToken('#token=zzz', store)).toBe('zzz');
    expect(loadToken('', store)).toBe('zzz');
  });
});

describe('receipt model', () => {
  it('builds submissions with answers after reveal and purse links', () => {
    const r = buildReceipt((fx as { events: never[] }).events);
    expect(r.submissions.length).toBeGreaterThan(0);
    expect(r.submissions.every((s) => s.answer !== null)).toBe(true);
    const pre = buildReceipt((fx as { events: { type: string }[] }).events.filter((e) => e.type !== 'match.revealed') as never[]);
    expect(pre.submissions.every((s) => s.answer === null)).toBe(true);
    expect(r.purses.some((p) => p.kind === 'paid' && isTxHash(p.ref))).toBe(true);
    expect(basescanUrl('0xab')).toBe('https://sepolia.basescan.org/tx/0xab');
  });
});
