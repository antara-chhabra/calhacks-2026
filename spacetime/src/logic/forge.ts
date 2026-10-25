// Pure forge validators (PRD FC-F-200, -201, -205, -066). No SpacetimeDB imports: unit-testable.
export const FORGE_FEE_CENTS = 100n;
export const MAX_ACTIVE_FIGHTERS = 2;

export type ForgeCode = 'bad_name' | 'bad_persona' | 'bad_address' | 'bad_spec';
export class ForgeError extends Error {
  constructor(public code: ForgeCode) { super(code); this.name = 'ForgeError'; }
}

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _'.-]{1,12}[A-Za-z0-9]$/;   // 3-14 chars
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const URL_RE = /(https?:\/\/|ftp:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|dev|xyz|ai|app|co|sh|ru|cn)\b|data:|javascript:|file:)/i;
const SHELL_RE = /(`|\$\(|\$\{|&&|\|\||;\s*(rm|curl|wget|bash|sh|cat|chmod|sudo)\b|\b(rm\s+-|curl\s|wget\s|sudo\s|chmod\s|bash\s+-|sh\s+-c|eval\(|exec\(|nc\s+-|powershell|cmd\.exe)|>\s*\/|\/etc\/|\/bin\/|~\/\.|\.\.\/)/i;
const INJECTION_RE = new RegExp([
  'ignore\\s+(all\\s+|any\\s+)?(previous|prior|above|earlier)',
  'disregard\\s+(all\\s+|the\\s+|any\\s+)?(previous|prior|above|instructions|rules)',
  'forget\\s+(all\\s+|your\\s+)?(previous|prior|instructions|rules)',
  'system\\s*prompt', 'developer\\s*message', 'you\\s+are\\s+now\\b', 'new\\s+instructions',
  '</?\\s*(persona|system|assistant|user|tool|instructions?)\\s*>',
  '\\[\\s*/?\\s*(inst|system)\\s*\\]', '<\\|[a-z_]+\\|>',
  '(^|\\n)\\s*(system|assistant|human|user)\\s*:',
  'reveal\\s+(your|the)\\s+(prompt|instructions|key|secret)', 'api[_ -]?key', 'FC_MODEL',
  '\\b(read|write|open|delete|run|execute)\\s+(the\\s+)?(file|files|shell|command|terminal|network)\\b',
].join('|'), 'i');
// eslint-disable-next-line no-control-regex
const CTRL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‏‪-‮⁦-⁩]/;

export function validateName(name: string): void {
  const n = name.trim();
  if (n !== name || n.length < 3 || n.length > 14 || !NAME_RE.test(n) || / {2,}/.test(n)) throw new ForgeError('bad_name');
}
export const nameKey = (name: string): string => name.toLowerCase();

/** Persona is untrusted data (FC-F-066): <= 600 chars, no URLs, shell commands, control chars or injection markers. */
export function validatePersona(persona: string): void {
  if (persona.trim().length === 0 || persona.length > 600) throw new ForgeError('bad_persona');
  if (CTRL_RE.test(persona) || URL_RE.test(persona) || SHELL_RE.test(persona) || INJECTION_RE.test(persona)) {
    throw new ForgeError('bad_persona');
  }
}

/** Short free-text fields (title, catchphrase): same URL/shell/injection screen, tighter length. */
export function validateShortText(s: string, max: number, allowEmpty = false): void {
  if ((!allowEmpty && s.trim().length === 0) || s.length > max) throw new ForgeError('bad_spec');
  if (CTRL_RE.test(s) || URL_RE.test(s) || SHELL_RE.test(s) || INJECTION_RE.test(s)) throw new ForgeError('bad_spec');
}

export function validateAddress(address: string): void {
  if (!ADDRESS_RE.test(address)) throw new ForgeError('bad_address');
}

export function validateEndpoint(url: string): void {
  if (url.length > 300 || !/^https:\/\/[^\s/@]+(\/\S*)?$/.test(url)) throw new ForgeError('bad_spec');
}

export type ForgeSpecLike = {
  name: string; title: string; catchphrase: string; persona: string; tier: string;
  payoutAddress?: string | null; endpointUrl?: string | null;
};

/** Validation order: name, persona, title/catchphrase, tier, optional address and endpoint. */
export function validateForgeSpec(spec: ForgeSpecLike): void {
  validateName(spec.name);
  validatePersona(spec.persona);
  validateShortText(spec.title, 40);
  validateShortText(spec.catchphrase, 60, true);
  if (spec.tier !== 'standard' && spec.tier !== 'pro') throw new ForgeError('bad_spec');
  if (spec.payoutAddress != null) validateAddress(spec.payoutAddress);
  if (spec.endpointUrl != null) validateEndpoint(spec.endpointUrl);
}

/** Verify is locked off for community fighters in H0 (FC-F-200). */
export function forceVerifyOff<S extends { verify: boolean }>(s: S): S { return { ...s, verify: false }; }

/** Deterministic 'f_' + 8 base36 chars from sender hex and a microsecond timestamp (FNV-1a x2, no randomness). */
export function deriveFighterId(senderHex: string, micros: bigint, salt = 0): string {
  const input = `${senderHex}|${micros}|${salt}`;
  let h1 = 0x811c9dc5, h2 = 0x01000193 ^ 0xdeadbeef;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
    h2 = (h2 ^ (h2 >>> 13)) >>> 0;
  }
  const s = (h1.toString(36).padStart(7, '0') + h2.toString(36).padStart(7, '0'));
  return 'f_' + s.slice(0, 4) + s.slice(-4);
}
