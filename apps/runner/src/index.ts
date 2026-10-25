// Runner entry point: `npm run runner`.
import { EnvError, loadEnv, redactedEnvSummary } from './env.js';
import { createApp } from './http/app.js';
import { wire } from './wiring.js';

async function main() {
  const env = loadEnv();
  const rt = await wire(env);
  const app = createApp(env, { payments: rt.payments });
  const ports = await app.start();
  const s = redactedEnvSummary(env);
  console.log(
    `[runner] up mode=${s.mode} engine=${s.engine} money=${s.moneyMode} admin=127.0.0.1:${ports.adminPort} public=0.0.0.0:${ports.publicPort} ` +
    `stdb=${rt.stdb.status()} db=${s.stdbDb} identity=${rt.stdb.identity() ?? 'none'} payments=${rt.payments.enabled ? 'on' : 'off'}`,
  );
  let stopping = false;
  const shutdown = async (sig: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[runner] ${sig}, shutting down`);
    try { await app.stop(); rt.stdb.close(); } finally { process.exit(0); }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((e) => {
  console.error(`[runner] fatal: ${e instanceof EnvError ? e.message : (e as Error).message}`);
  process.exit(1);
});
