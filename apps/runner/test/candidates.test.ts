import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/env.js';
import { loadHouseCandidates } from '../src/candidates.js';

describe('house candidate configuration', () => {
  it('maps configured effort without exposing model identifiers through candidate summaries', () => {
    const env = loadEnv({ FC_DIRECTOR_TOKEN: 'x'.repeat(32), FC_ENGINE: 'mock', FC_EFFORT_VEX: 'low', FC_EFFORT_GLITCH: 'high', FC_MODEL_VEX: 'secret-model-value' });
    const vex = loadHouseCandidates(env).find((c) => c.fighter.id === 'vex');
    const glitch = loadHouseCandidates(env).find((c) => c.fighter.id === 'glitch');
    expect(vex).toMatchObject({ reasoningEffort: 'low', modelId: 'secret-model-value' });
    expect(glitch?.reasoningEffort).toBe('high');
  });
});
