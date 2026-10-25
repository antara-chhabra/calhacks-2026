// App shell (U-01). Stub: every screen wraps its content in <AppShell>; U-01 replaces the body, never the props.
import type { ReactNode } from "react";

export function AppShell(props: { children: ReactNode; title?: string; wide?: boolean }) {
  return <div className="min-h-dvh bg-black text-zinc-100">{props.children}</div>;
}
