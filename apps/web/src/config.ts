// Web runtime config from VITE_* env (PRD §8.11).
export const config = {
  stdbUri: import.meta.env.VITE_STDB_URI || 'ws://127.0.0.1:3000',
  stdbDb: import.meta.env.VITE_STDB_DB || 'fightcard',
  publicWebUrl: import.meta.env.VITE_PUBLIC_WEB_URL || window.location.origin,
  runnerAdminUrl: import.meta.env.VITE_RUNNER_ADMIN_URL || 'http://127.0.0.1:8787',
} as const;
