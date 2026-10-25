// Typed admin client for the runner (PRD §8.10). Pure: fetch is injectable so tests can mock it. Never logs the token.
export type Health = {
  ok: boolean; mode: string; engine: string;
  stdb: 'ok' | 'down'; droid: 'ok' | 'down' | 'mock'; payments: 'off' | 'ok' | 'down';
  season: { on: boolean; played: number; creditsHour: number; pausedReason: string | null };
};

export class AdminError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) { super(message); this.name = 'AdminError'; }
  get unreachable(): boolean { return this.code === 'unreachable'; }
  get unauthorized(): boolean { return this.code === 'unauthorized'; }
}

const MESSAGES: Record<string, string> = {
  unauthorized: 'Director token rejected. Re-open /director#token=… with the right token.',
  match_active: 'A match is already running. Void or finish it first.',
  not_found: 'That match was not found.',
  bad_request: 'The runner rejected the request.',
  bad_json: 'The runner could not parse the request.',
  unreachable: 'Runner unreachable. Is it running and is the admin URL right?',
};
export function describeError(code: string, fallback?: string): string {
  return MESSAGES[code] ?? (fallback || `Runner error (${code})`);
}

type FetchFn = typeof fetch;
export type AdminClient = ReturnType<typeof createAdminClient>;

export function createAdminClient(baseUrl: string, token: string, fetchFn: FetchFn = (...a) => fetch(...a)) {
  const base = baseUrl.replace(/\/+$/, '');
  async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetchFn(base + path, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new AdminError('unreachable', describeError('unreachable'), 0);
    }
    if (res.status === 204) return undefined as T;
    let json: unknown = null;
    try { json = await res.json(); } catch { /* non-JSON body */ }
    if (!res.ok) {
      const e = (json as { error?: { code?: string; message?: string } } | null)?.error;
      const code = e?.code ?? `http_${res.status}`;
      throw new AdminError(code, describeError(code, e?.message), res.status);
    }
    return json as T;
  }
  const enc = encodeURIComponent;
  return {
    health: () => call<Health>('GET', '/admin/health'),
    log: async (lines = 50) => (await call<{ lines: string[] }>('GET', `/admin/log?lines=${lines}`)).lines.slice(-lines),
    createMatch: (o: { fighters?: string[]; betWindowS?: number; category?: string } = {}) => call<{ matchId: string }>('POST', '/admin/matches', o),
    lock: (id: string) => call<void>('POST', `/admin/matches/${enc(id)}/lock`, {}),
    hold: (id: string, seconds: number) => call<void>('POST', `/admin/matches/${enc(id)}/hold`, { seconds }),
    voidMatch: (id: string, reason: string) => call<void>('POST', `/admin/matches/${enc(id)}/void`, { reason }),
    setSeason: (on: boolean) => call<void>('POST', '/admin/season', { on }),
    demo: (fixture: string) => call<void>('POST', '/admin/demo', { fixture }),
  };
}

// ---- token handling: arrives in location.hash, lives in sessionStorage, never in the query string.
const KEY = 'fc.director';
export function parseTokenFromHash(hash: string): string | null {
  const m = /(?:^#|&)token=([^&]+)/.exec(hash);
  if (!m) return null;
  try { const t = decodeURIComponent(m[1]!).trim(); return t || null; } catch { return null; }
}
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const ss = (): Store | null => { try { return window.sessionStorage; } catch { return null; } };
export function loadToken(hash: string, store: Store | null = ss()): string | null {
  const fromHash = parseTokenFromHash(hash);
  if (fromHash) { try { store?.setItem(KEY, fromHash); } catch { /* ignore */ } return fromHash; }
  try { return store?.getItem(KEY) ?? null; } catch { return null; }
}
export function forgetToken(store: Store | null = ss()): void { try { store?.removeItem(KEY); } catch { /* ignore */ } }
