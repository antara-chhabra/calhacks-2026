import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FighterRunInput } from '../types.js';
import { problemPrompt } from './prompts.js';

export async function prepareSandbox(input: FighterRunInput, reveal: boolean): Promise<void> {
  await mkdir(join(input.sandboxDir, 'scratch'), { recursive: true });
  await writeFile(join(input.sandboxDir, 'PROBLEMS.md'), reveal ? problemPrompt(input) : 'The bell has not rung. Problems arrive at match.started.\n', { mode: 0o600 });
}
