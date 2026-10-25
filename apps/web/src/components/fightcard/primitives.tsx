import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { type ButtonHTMLAttributes, useEffect, useRef, useState } from "react";
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
    <span className={cn("inline-flex items-center gap-1.5 tabular-nums", className)} title="Play money · no cash value">
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
