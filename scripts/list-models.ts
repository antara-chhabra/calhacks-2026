// Discover privately. Configured model IDs and vendor metadata never reach stdout.
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { listModels } from '@factory/droid-sdk/node';
import { minimalEnvironment } from '../apps/runner/src/fighters/droid/index.js';

try { loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url))); } catch { /* caller may provide env */ }
try {
  const models = await listModels({ env: minimalEnvironment(), execPath: fileURLToPath(new URL('../apps/runner/bin/droid-sandboxed', import.meta.url)) });
  console.log(`Selectable models: ${models.filter((m) => !m.disabled).length}. IDs remain private.`);
  for (const id of ['VEX', 'SAGE', 'GLITCH', 'QUILL', 'BRICK', 'PIP', 'TIER_STANDARD', 'TIER_PRO']) {
    const configured = process.env[`FC_${id.startsWith('TIER_') ? `${id}_MODEL` : `MODEL_${id}`}`];
    console.log(`${id}: ${!configured ? 'not configured' : configured === 'auto' ? 'invalid: auto forbidden' : models.some((m) => m.id === configured && !m.disabled) ? 'configured and available' : 'configured but unavailable'}`);
  }
} catch {
  console.error('Model discovery failed. Check Droid installation, network and Factory authentication.');
  process.exitCode = 1;
}
