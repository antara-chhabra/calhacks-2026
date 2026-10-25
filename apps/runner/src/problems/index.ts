// Problem generator and verifier (PRD §8.9, §11.4–11.5). O4 implements (R-01).
export { generateProblemSet } from './generator.js';
export { checkLive, checkFinal } from './check.js';
export { parseAnswer, parseNode, preprocess } from './parse.js';
export type { ParsedAnswer, ParseError } from './parse.js';
