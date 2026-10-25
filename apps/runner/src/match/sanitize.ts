// Text filters for anything a fighter can put on the public feed (FC-F-043, FC-F-060, §11.7).
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
const MODEL_RE = /\b(?:claude|anthropic|opus|sonnet|haiku|gpt[-\w.]*|openai|chatgpt|o[134]-\w+|gemini|bard|llama[-\w.]*|mistral|mixtral|qwen[-\w.]*|deepseek|grok|kimi|glm[-\w.]*|droid|factory|fable)\b/gi;
const AI_RE = /\b(?:a\.?i\.?|llm|language model|large language model|artificial intelligence|neural net\w*)\b/i;
// eslint-disable-next-line no-control-regex
const CTRL_RE = /[\u0000-\u001f\u007f]/g;

export function cleanText(s: string, max: number): string {
  return s.replace(URL_RE, '').replace(MODEL_RE, '').replace(CTRL_RE, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim();
}

/** Public speech filter: ≤ 80 chars, no URLs or model/vendor names; rejects out-of-character AI talk. */
export function filterSay(text: string): { ok: true; text: string } | { ok: false; reason: string } {
  if (typeof text !== 'string') return { ok: false, reason: 'not text' };
  if (AI_RE.test(text)) return { ok: false, reason: 'stay in character' };
  const t = cleanText(text, 80);
  return t ? { ok: true, text: t } : { ok: false, reason: 'empty' };
}

/** Tool label: ≤ 48 chars, no URLs, model names or absolute paths. */
export function cleanLabel(s: string): string {
  return cleanText(cleanText(String(s), 400).replace(/(?:\/[\w.-]+){2,}/g, ' '), 48) || 'working';
}
