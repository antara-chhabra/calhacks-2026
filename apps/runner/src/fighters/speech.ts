// Validate before handing public text to the runtime (FC-F-047/048).
const FORBIDDEN = /https?:|www\.|\b(?:claude|anthropic|opus|sonnet|haiku|gpt[\w.-]*|openai|chatgpt|gemini|llama|mistral|qwen|deepseek|grok|kimi|droid|factory|fuck|shit|bitch|asshole)\b/i;
export function speechAllowed(text: string): boolean {
  if (!text.trim() || text.length > 80 || FORBIDDEN.test(text) || /[\u0000-\u001f\u007f]/.test(text)) return false;
  const lower = text.toLowerCase();
  return !Object.entries(process.env).some(([key, value]) => /MODEL|API_KEY|TOKEN|SECRET/.test(key) && value && lower.includes(value.toLowerCase()));
}
