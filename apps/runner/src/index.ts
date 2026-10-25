// Runner entry point: `npm run runner`.
import { EnvError, loadEnv, redactedEnvSummary } from './env.js';
import { createApp } from './http/app.js';
import { recoverOrphans } from './match/recover.js';
import { wire } from './wiring.js';

async function main() {
  const env = loadEnv();
  const rt = await wire(env);
  const app = createApp(env, { payments: rt.payments, director: rt.director });
  const ports = await app.start();
  const s = redactedEnvSummary(env);
  console.log(
    `[runner] up mode=${s.mode} engine=${s.engine} money=${s.moneyMode} admin=127.0.0.1:${ports.adminPort} public=0.0.0.0:${ports.publicPort} ` +
    `stdb=${rt.stdb.status()} db=${s.stdbDb} identity=${rt.stdb.identity() ?? 'none'} payments=${rt.payments.enabled ? 'on' : 'off'}`,
  );
  if (rt.stdb.status() === 'ok' && rt.stdb.listActiveMatches) {
    try {
      const voided = await recoverOrphans(rt.stdb, () => rt.stdb.listActiveMatches!());
      if (voided.length) console.log(`[runner] recovered ${voided.length} orphaned match(es)`);
    } catch (e) { console.warn(`[runner] orphan recovery failed: ${(e as Error).message}`); }
  }
  if (env.FC_SEASON === 'on') rt.director.setSeason(true);

  let stopping = false;
  const shutdown = async (sig: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[runner] ${sig}, shutting down`);
    try { await rt.shutdown(); await app.stop(); rt.stdb.close(); } finally { process.exit(0); }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((e) => {
  console.error(`[runner] fatal: ${e instanceof EnvError ? e.message : (e as Error).message}`);
  process.exit(1);
});
