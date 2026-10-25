/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_STDB_URI?: string;
  readonly VITE_STDB_DB?: string;
  readonly VITE_DIRECTOR_TOKEN?: string;   // local presenter laptop only (gitignored .env.local)
  readonly VITE_PUBLIC_WEB_URL?: string;
  readonly VITE_RUNNER_ADMIN_URL?: string;
}
