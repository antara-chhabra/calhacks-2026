// Fighter backend registry (PRD §8.9). Every engine is pre-declared; O5 swaps a stub for a real backend
// by replacing the entry's implementation file, not this map's shape.
import type { FighterBackend } from './types.js';
import { createMockBackend } from './mock.js';
import { createDroidBackend } from './droid/index.js';
import { createDirectBackend } from './direct.js';
import { createHttpBackend } from './http.js';

const stub = (engine: FighterBackend['engine']): FighterBackend => ({
  engine,
  async run() { throw new Error(`not implemented: fighter backend '${engine}'`); },
});

const BACKENDS: Record<FighterBackend['engine'], FighterBackend> = {
  droid: createDroidBackend(),
  direct: createDirectBackend(),
  mock: createMockBackend(),   // no answerFor: O4 builds its own via createMockBackend({ answerFor }) when it knows the references
  http: createHttpBackend(),
  uagent: stub('uagent'),
};

export function getBackend(engine: FighterBackend['engine']): FighterBackend {
  return BACKENDS[engine];
}
