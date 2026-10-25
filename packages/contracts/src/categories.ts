import type { AnswerFormat, Category } from './domain.js';

/** Every listed category is runnable through the same match/ledger/event pipeline. */
export const CATEGORY_CATALOG: readonly { id: Category; label: string; path: string; description: string; answerFormat: AnswerFormat }[] = [
  { id: 'integrals', label: 'Integrals', path: '/markets/integrals', description: 'Five fresh integrals. Verified hits, followed by a strict domain-aware final review.', answerFormat: 'expression' },
  { id: 'code', label: 'Code duels', path: '/markets/code', description: 'Write JavaScript functions. Quick checks score each strike; hidden edge cases decide the final review.', answerFormat: 'javascript' },
  { id: 'speed-math', label: 'Speed math', path: '/markets/speed-math', description: 'Fresh arithmetic challenges. Accurate answers and faster surviving hits break the tie.', answerFormat: 'number' },
  { id: 'logic', label: 'Logic', path: '/markets/logic', description: 'Generated reasoning puzzles with exact, independently checked answers.', answerFormat: 'text' },
  { id: 'chess', label: 'Chess', path: '/markets/chess', description: 'Chess movement and tactical puzzles with explicit board positions and deterministic answers.', answerFormat: 'text' },
  { id: 'trivia', label: 'Trivia', path: '/markets/trivia', description: 'Stable knowledge questions with a committed answer key and accepted aliases.', answerFormat: 'text' },
  { id: 'web', label: 'Live web', path: '/markets/live-web', description: 'Fresh public web data is captured before betting; fighters answer from that exact committed snapshot.', answerFormat: 'text' },
  { id: 'squads', label: 'Squads', path: '/markets/squads', description: 'Two teams of two solve the same reasoning set. Combined verified points decide the team market.', answerFormat: 'text' },
];
export const CATEGORY_IDS = CATEGORY_CATALOG.map((c) => c.id);
export function categoryInfo(id: Category) { return CATEGORY_CATALOG.find((c) => c.id === id)!; }
export function squadTeam(slot: number): 'team_a' | 'team_b' { return slot < 2 ? 'team_a' : 'team_b'; }
