// Formatting helpers: mathjs strings (PRD §11.5 whitelist) and KaTeX.
export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** reduced fraction n/d as a mathjs string ("3", "-3/4"); d != 0 */
export function frac(n: number, d: number): string {
  const g = gcd(n, d) || 1;
  let p = n / g, q = d / g;
  if (q < 0) { p = -p; q = -q; }
  return q === 1 ? `${p}` : `${p}/${q}`;
}

/** coefficient times body: 1 -> body, -1 -> -body */
export function term(c: string, body: string): string {
  if (c === '1') return body;
  if (c === '-1') return `-${body}`;
  return `${c}*${body}`;
}

/** join signed terms: a "-" prefix becomes " - " */
export function sum(terms: string[]): string {
  return terms.reduce((acc, t, i) => {
    if (i === 0) return t;
    return t.startsWith('-') ? `${acc} - ${t.slice(1)}` : `${acc} + ${t}`;
  }, '');
}

/** polynomial from coefficients cs[k] of x^k, descending, zero terms skipped */
export function poly(cs: number[], tex = false): string {
  const parts: string[] = [];
  for (let k = cs.length - 1; k >= 0; k--) {
    const c = cs[k]!;
    if (c === 0) continue;
    const mag = Math.abs(c);
    const body = k === 0 ? '' : k === 1 ? 'x' : tex ? `x^{${k}}` : `x^${k}`;
    let t: string;
    if (k === 0) t = `${mag}`;
    else if (mag === 1) t = body;
    else t = tex ? `${mag}${body}` : `${mag}*${body}`;
    parts.push(c < 0 ? `-${t}` : t);
  }
  return sum(parts) || '0';
}

/** "x + 3" / "x - 3" / "x" */
export const lin = (c: number): string => (c === 0 ? 'x' : c > 0 ? `x + ${c}` : `x - ${-c}`);

/** a*x with a=1 collapsed */
export const ax = (a: number): string => (a === 1 ? 'x' : a === -1 ? '-x' : `${a}*x`);
export const axTex = (a: number): string => (a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`);

/** TeX coefficient prefix: 1 -> "", -1 -> "-" */
export const cTex = (c: number): string => (c === 1 ? '' : c === -1 ? '-' : `${c}`);

/** sqrt(n) as a mathjs string, integer when n is a perfect square */
export function sqrtStr(n: number): string {
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? `${r}` : `sqrt(${n})`;
}

export const r2 = (x: number): number => Math.round(x * 100) / 100;
export const int = (tex: string): string => `\\int ${tex}\\,dx`;
