// Fighter backend registry (PRD §8.9). Every engine is pre-declared; O5 swaps a stub for a real backend
// by replacing the entry's implementation file, not this map's shape.
import type { FighterBackend } from './types.js';
import { createMockBackend } from './mock.js';

const stub = (engine: FighterBackend['engine']): FighterBackend => ({
  engine,
  async run() { throw new Error(`not implemented: fighter backend '${engine}'`); },
});

const BACKENDS: Record<FighterBackend['engine'], FighterBackend> = {
  droid: stub('droid'),
  direct: stub('direct'),
  mock: createMockBackend(),   // no answerFor: O4 builds its own via createMockBackend({ answerFor }) when it knows the references
  http: stub('http'),
  uagent: stub('uagent'),
};

export function getBackend(engine: FighterBackend['engine']): FighterBackend {
  return BACKENDS[engine];
}
