// Client-side mirrors of the create_fighter rules (spacetime/src/logic/forge.ts, FC-F-066/-201). Pure; no React.
// Keep in lockstep with the module: ui-forge.test.ts compares both implementations on the same inputs.
export const FORGE_FEE_CENTS = 100;
export const NAME_MIN = 3;
export const NAME_MAX = 14;
export const TITLE_MAX = 32;
export const CATCH_MAX = 60;
export const PERSONA_MAX = 600;

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _'.-]{1,12}[A-Za-z0-9]$/;
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

export type FieldCheck = { ok: true } | { ok: false; error: string };
const ok: FieldCheck = { ok: true };
const bad = (error: string): FieldCheck => ({ ok: false, error });

/** Same predicate as the module's validateName. */
export function nameOk(name: string): boolean {
  const n = name.trim();
  return !(n !== name || n.length < NAME_MIN || n.length > NAME_MAX || !NAME_RE.test(n) || / {2,}/.test(n));
}
export function personaOk(p: string): boolean {
  if (p.trim().length === 0 || p.length > PERSONA_MAX) return false;
  return !(CTRL_RE.test(p) || URL_RE.test(p) || SHELL_RE.test(p) || INJECTION_RE.test(p));
}
export function shortTextOk(s: string, max: number, allowEmpty = false): boolean {
  if ((!allowEmpty && s.trim().length === 0) || s.length > max) return false;
  return !(CTRL_RE.test(s) || URL_RE.test(s) || SHELL_RE.test(s) || INJECTION_RE.test(s));
}
export const addressOk = (a: string): boolean => ADDRESS_RE.test(a);

export function checkName(name: string): FieldCheck {
  if (name.length === 0) return bad('Pick a name.');
  if (name !== name.trim()) return bad('No spaces at the start or end.');
  if (name.length < NAME_MIN) return bad(`At least ${NAME_MIN} characters.`);
  if (name.length > NAME_MAX) return bad(`At most ${NAME_MAX} characters.`);
  if (/ {2,}/.test(name)) return bad('No double spaces.');
  if (!nameOk(name)) return bad("Letters, numbers, spaces and _ ' . - only; start and end with a letter or number.");
  return ok;
}
export function checkTitle(title: string): FieldCheck {
  if (title.trim().length === 0) return bad('Give your fighter a title.');
  if (title.length > TITLE_MAX) return bad(`At most ${TITLE_MAX} characters.`);
  if (!shortTextOk(title, TITLE_MAX)) return bad("Title can't include links or commands.");
  return ok;
}
export function checkCatchphrase(c: string): FieldCheck {
  if (c.length > CATCH_MAX) return bad(`At most ${CATCH_MAX} characters.`);
  if (!shortTextOk(c, CATCH_MAX, true)) return bad("Catchphrase can't include links or commands.");
  return ok;
}
export function checkPersona(p: string): FieldCheck {
  if (p.trim().length === 0) return bad('Describe how your fighter talks and thinks.');
  if (p.length > PERSONA_MAX) return bad(`At most ${PERSONA_MAX} characters.`);
  if (!personaOk(p)) return bad("Persona can't include links or commands.");
  return ok;
}

/** §10.4 / §8.8 copy for create_fighter rejections. */
export const FORGE_ERROR_COPY: Record<string, string> = {
  bad_name: "Name must be 3–14 characters: letters, numbers, spaces and _ ' . - only.",
  name_taken: 'That fighter name is taken.',
  bad_persona: "Persona can't include links or commands.",
  bad_spec: 'Something in your fighter is not allowed. Check title and catchphrase for links or commands.',
  too_many_fighters: 'You already have 2 active fighters. Retire one to forge another.',
  insufficient_funds: 'Not enough balance. Add funds or bet less.',
  slow_down: 'Easy — one at a time.',
  not_registered: 'Pick a handle first.',
  not_connected: 'Connect to a live match to forge.',
};
export function forgeErrorCopy(e: unknown): string {
  const code = e instanceof Error ? e.message : String(e);
  return FORGE_ERROR_COPY[code] ?? 'Could not forge right now. Try again.';
}
