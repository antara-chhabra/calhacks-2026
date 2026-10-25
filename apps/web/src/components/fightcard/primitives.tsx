import { ArrowDownRight, ArrowUpRight, X } from "lucide-react";
import { formatCents } from "@fc/contracts";
import { type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { create } from "zustand";
import { cn } from "@/lib/utils";
import type { Agent } from "@/ui/mock";

/** Agent avatar: a monogram in the fighter's identity color (art comes later). */
export function AgentAvatar({ agent, size = 28, className }: { agent: Agent; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold text-zinc-950 ring-1 ring-white/10", className)}
      style={{ width: size, height: size, backgroundColor: agent.color, fontSize: Math.max(9, size * 0.36) }}
    >
      {agent.name.slice(0, 2)}
    </span>
  );
}

/** Smooth-ish sparkline with a soft area fill; color follows the direction. */
export function Sparkline({ values, width = 96, height = 28, className }: { values: number[]; width?: number; height?: number; className?: string }) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 2 - ((v - lo) / span) * (height - 4)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const up = values[values.length - 1] >= values[0];
  const stroke = up ? "#4ade80" : "#fb7185";
  return (
    <svg aria-hidden="true" className={cn("overflow-visible", className)} height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
      <path d={`${line} L${width} ${height} L0 ${height} Z`} fill={stroke} opacity={0.12} />
      <path d={line} fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} />
    </svg>
  );
}

export function ChangeChip({ value, className }: { value: number; className?: string }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium text-[11px] tabular-nums",
        up ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400",
        className
      )}
    >
      <Icon className="size-3" strokeWidth={2.5} />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function Chips({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 tabular-nums", className)} title="Ledger balance · no funds moved">
      <span aria-hidden="true" className="size-3 rounded-full bg-amber-300 ring-2 ring-amber-500/40" />
      {amount.toLocaleString("en-US")}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2", className)}>
      <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-60 motion-reduce:animate-none" />
      <span className="relative inline-flex size-2 rounded-full bg-red-500" />
    </span>
  );
}

type Tone = "primary" | "secondary" | "yes" | "no" | "ghost";
const TONE: Record<Tone, string> = {
  primary: "bg-zinc-100 text-zinc-950 hover:bg-white",
  secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
  yes: "bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20",
  no: "bg-rose-400/10 text-rose-400 hover:bg-rose-400/20",
  ghost: "text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-100 hover:ring-zinc-700",
};

export function Button({ tone = "secondary", className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 font-medium text-[13px] transition-colors duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-400/50",
        TONE[tone],
        className
      )}
      data-no-press
      type="button"
      {...rest}
    />
  );
}

/**
 * A value that drifts like a live order book, for demo tiles. Returns the
 * value and the direction of its last move so callers can flash it.
 */
export function useLiveValue(initial: number, { step = 1, min = 1, max = 99, everyMs = 2400 } = {}) {
  const [state, setState] = useState({ value: initial, dir: 0 });
  const seed = useRef(initial * 7919);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      seed.current = (seed.current * 16_807) % 2_147_483_647;
      const r = seed.current / 2_147_483_647;
      setState(({ value }) => {
        const next = Math.min(max, Math.max(min, Math.round((value + (r - 0.48) * step * 2) * 10) / 10));
        return { value: next, dir: Math.sign(next - value) };
      });
    }, everyMs + (initial % 7) * 90);
    return () => clearInterval(timer);
  }, [initial, step, min, max, everyMs]);
  return state;
}

/* ---------------------------------------------------------------- U-01 additions */

const FOCUS = "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-400/60";

/** Button sizes + `loading`. `Button` above keeps its original signature; this wraps it. */
export function ButtonX({ size = "md", loading, disabled, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  const sz = { sm: "h-7 px-2.5 text-xs", md: "", lg: "h-10 px-5 text-sm" }[size];
  return (
    <Button aria-busy={loading || undefined} className={cn(sz, "disabled:pointer-events-none disabled:opacity-40", className)} disabled={disabled || loading} {...rest}>
      {loading && <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />}
      {children}
    </Button>
  );
}

/** Black bordered surface. `title` renders a small header row; `action` sits at its right. */
export function Panel({ title, action, className, children, ...rest }: Omit<HTMLAttributes<HTMLElement>, "title"> & { title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-zinc-900 bg-zinc-950 p-4", className)} {...rest}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <h3 className="font-medium text-sm text-zinc-200">{title}</h3>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** Accessible tablist. Controlled via `value`/`onChange`; arrow keys move selection. */
export function Tabs<T extends string>({ tabs, value, onChange, className, label }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (id: T) => void; className?: string; label?: string }) {
  const onKey = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value);
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (d) {
      e.preventDefault();
      onChange(tabs[(i + d + tabs.length) % tabs.length].id);
    }
  };
  return (
    <div aria-label={label} className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-zinc-900 p-1", className)} onKeyDown={onKey} role="tablist">
      {tabs.map((t) => (
        <button
          aria-selected={t.id === value}
          className={cn("shrink-0 whitespace-nowrap rounded-lg px-3 py-1 font-medium text-[13px] transition-colors", FOCUS, t.id === value ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-zinc-100")}
          data-no-press
          key={t.id}
          onClick={() => onChange(t.id)}
          role="tab"
          tabIndex={t.id === value ? 0 : -1}
          type="button"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Dialog with backdrop, Escape-to-close and focus restore. Renders nothing when closed. */
export function Modal({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div aria-labelledby={titleId} aria-modal="true" className={cn("max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-950 p-5 outline-hidden sm:max-w-md sm:rounded-2xl", className)} ref={box} role="dialog" tabIndex={-1}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-base text-zinc-50" id={titleId}>{title}</h2>
          <button aria-label="Close" className={cn("rounded-md p-1 text-zinc-500 hover:text-zinc-100", FOCUS)} onClick={onClose} type="button"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export type ToastKind = "info" | "success" | "error";
type ToastItem = { id: number; kind: ToastKind; text: string };
const useToasts = create<{ items: ToastItem[]; dismiss(id: number): void }>()((set) => ({ items: [], dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })) }));
let toastSeq = 0;
/** Fire a toast from anywhere (no hook needed). Auto-dismisses after `ms` (default 4s). */
export function toast(text: string, kind: ToastKind = "info", ms = 4000): void {
  const id = ++toastSeq;
  useToasts.setState((s) => ({ items: [...s.items.slice(-3), { id, kind, text }] }));
  setTimeout(() => useToasts.getState().dismiss(id), ms);
}
/** Mounted once by AppShell. */
export function Toaster() {
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);
  const tone = { info: "text-zinc-100", success: "text-emerald-400", error: "text-rose-400" } as const;
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div className={cn("pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-[13px] shadow-lg", tone[t.kind])} key={t.id} role={t.kind === "error" ? "alert" : "status"}>
          <span className="min-w-0 flex-1">{t.text}</span>
          <button aria-label="Dismiss" className={cn("rounded text-zinc-500 hover:text-zinc-100", FOCUS)} onClick={() => dismiss(t.id)} type="button"><X className="size-3.5" /></button>
        </div>
      ))}
    </div>
  );
}

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-zinc-900 motion-reduce:animate-none", className)} {...rest} />;
}

/** Integer cents rendered as $x.xx with tabular numerals. `signed` adds +/− and up/down color; `tone` colors by sign. */
export function Money({ cents, signed, className }: { cents: number; signed?: boolean; className?: string }) {
  const text = signed && cents > 0 ? `+${formatCents(cents)}` : formatCents(cents);
  const color = signed ? (cents > 0 ? "text-emerald-400" : cents < 0 ? "text-rose-400" : "") : "";
  return <span className={cn("tabular-nums", color, className)}>{text}</span>;
}

/** Odds as decimal multiple ("2.40×") or implied probability ("42%"). `selected` highlights; `onClick` makes it a button. */
export function OddsChip({ odds, label, format = "decimal", selected, onClick, className }: { odds: number; label?: ReactNode; format?: "decimal" | "percent"; selected?: boolean; onClick?: () => void; className?: string }) {
  const val = format === "decimal" ? `${odds.toFixed(2)}×` : `${Math.round((1 / odds) * 100)}%`;
  const cls = cn(
    "inline-flex h-8 items-center gap-2 rounded-lg px-2.5 font-medium text-[13px] tabular-nums ring-1 transition-colors",
    selected ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/40" : "bg-zinc-900 text-zinc-200 ring-zinc-800 hover:ring-zinc-600",
    className
  );
  const body = (<>{label && <span className="text-zinc-500">{label}</span>}{val}</>);
  return onClick ? (
    <button aria-pressed={selected} className={cn(cls, FOCUS)} data-no-press onClick={onClick} type="button">{body}</button>
  ) : (
    <span className={cls}>{body}</span>
  );
}
