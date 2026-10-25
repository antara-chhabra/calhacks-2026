// Whitelist answer parser (PRD §11.5, FC-F-021). Answers are parsed to an AST, every node is checked
// against the whitelist, and only then compiled. Raw strings are never evaluated.
import { create, all, type MathNode, type EvalFunction } from 'mathjs';

export const math = create(all, { predictable: true });

export const MAX_ANSWER_CHARS = 400;
export const MAX_NODES = 300;
export const MAX_DEPTH = 40;

const FUNCS = new Set(['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'exp', 'log', 'sqrt', 'abs']);
const SYMBOLS = new Set(['x', 'e', 'pi']);
const BINARY_OPS = new Set(['+', '-', '*', '/', '^']);
const UNARY_OPS = new Set(['-', '+']);

export type ParseError = { error: 'invalid_syntax'; detail: string };
export type ParsedAnswer = { node: MathNode; source: string; evaluate: (x: number) => number };

/** Trim, strip a trailing "+ C", `**` -> `^`, `ln` -> `log`. */
export function preprocess(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\s*\+\s*[cC]$/, '');
  s = s.replace(/\*\*/g, '^');
  s = s.replace(/\bln\s*\(/g, 'log(');
  return s.trim();
}

class Reject extends Error {}
const rej = (m: string): never => { throw new Reject(m); };

function validate(root: MathNode): void {
  let count = 0;
  const walk = (n: MathNode, depth: number): void => {
    if (++count > MAX_NODES) rej('expression too large');
    if (depth > MAX_DEPTH) rej('expression too deeply nested');
    switch (n.type) {
      case 'ConstantNode': {
        const v = (n as unknown as { value: unknown }).value;
        if (typeof v !== 'number' || !Number.isFinite(v)) rej('only finite numeric constants allowed');
        return;
      }
      case 'SymbolNode': {
        const name = (n as unknown as { name: string }).name;
        if (!SYMBOLS.has(name)) rej(`symbol not allowed: ${name.slice(0, 20)}`);
        return;
      }
      case 'ParenthesisNode':
        return walk((n as unknown as { content: MathNode }).content, depth + 1);
      case 'OperatorNode': {
        const o = n as unknown as { op: string; fn: string; args: MathNode[] };
        const ok = o.args.length === 1 ? UNARY_OPS.has(o.op) : o.args.length === 2 && BINARY_OPS.has(o.op);
        if (!ok) rej(`operator not allowed: ${String(o.op).slice(0, 10)}`);
        for (const a of o.args) walk(a, depth + 1);
        return;
      }
      case 'FunctionNode': {
        const f = n as unknown as { fn: MathNode; args: MathNode[] };
        if (f.fn.type !== 'SymbolNode') return rej('function call not allowed');
        const name = (f.fn as unknown as { name: string }).name;
        if (FUNCS.has(name)) {
          if (f.args.length !== 1) rej(`${name} takes exactly one argument`);
          walk(f.args[0], depth + 1);
          return;
        }
        return rej(`function not allowed: ${name.slice(0, 20)}`);
      }
      default:
        return rej(`node type not allowed: ${n.type}`);
    }
  };
  walk(root, 0);
}

export function parseNode(answer: string): { node: MathNode; source: string } | ParseError {
  if (typeof answer !== 'string') return { error: 'invalid_syntax', detail: 'answer must be a string' };
  if (answer.length > MAX_ANSWER_CHARS + 20) return { error: 'invalid_syntax', detail: `over ${MAX_ANSWER_CHARS} characters` };
  const source = preprocess(answer);
  if (source.length === 0) return { error: 'invalid_syntax', detail: 'empty answer' };
  if (source.length > MAX_ANSWER_CHARS) return { error: 'invalid_syntax', detail: `over ${MAX_ANSWER_CHARS} characters` };
  try {
    const node = math.parse(source);
    validate(node);
    return { node, source };
  } catch (e) {
    return { error: 'invalid_syntax', detail: (e instanceof Error ? e.message : 'parse failure').slice(0, 120) };
  }
}

export function toEvaluator(node: MathNode): (x: number) => number {
  const code: EvalFunction = node.compile();
  return (x: number): number => {
    try {
      const v = code.evaluate({ x });
      return typeof v === 'number' ? v : NaN;
    } catch {
      return NaN;
    }
  };
}

/** Parse + whitelist-check + compile. Never evaluates the raw string. */
export function parseAnswer(answer: string): ParsedAnswer | ParseError {
  const r = parseNode(answer);
  if ('error' in r) return r;
  try {
    return { node: r.node, source: r.source, evaluate: toEvaluator(r.node) };
  } catch (e) {
    return { error: 'invalid_syntax', detail: (e instanceof Error ? e.message : 'compile failure').slice(0, 120) };
  }
}
