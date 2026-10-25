/**
 * Step tracker for bets and fights. Adapted from KokonutUI's Currency
 * Transfer (MIT, @dorianbaffier, kokonutui.com): same odometer amount, rail
 * and step nodes, with the copy, steps and amounts passed in as props so one
 * card can follow a bet from placement to payout or a match from lock to
 * settlement. Amounts are play-money chips, never currency.
 */

import { CheckIcon, CopyIcon, XIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type TrackerStatus = "processing" | "completed" | "failed";

export interface TrackerStep {
  id: string;
  title: string;
  detail: string;
  /** Title once the step is done, e.g. "Settling" becomes "Settled". */
  doneTitle?: string;
  doneDetail?: string;
}

export interface StepTrackerProps {
  title: string;
  subtitle: string;
  /** Two-letter monogram in the header avatar. */
  initials: string;
  /** Fighter identity color for the avatar, e.g. "#2EC4A6". */
  accent?: string;
  /** The amount rolls from `from` to `to` once step `convertAt` is done. */
  amount: { from: number; to: number; fromLabel: string; toLabel: string };
  /** Unit after the amount, e.g. "chips" or "pts". */
  unit?: string;
  convertAt?: number;
  caption: string;
  steps: TrackerStep[];
  failed?: { title: string; detail: string };
  pill?: Partial<Record<TrackerStatus, string>>;
  refId: string;
  footerNote: ReactNode;
  /** Controlled status. Leave unset for a demo that runs (and loops) on its own. */
  status?: TrackerStatus;
  stepMs?: number;
  /** Demo only: restart this long after completing. 0 stops on completion. */
  loopMs?: number;
  className?: string;
}

const EASE_OUT_CSS = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_IN_OUT_CSS = "cubic-bezier(0.77, 0, 0.175, 1)";
const FIRST_DONE = 1;
const DIGIT_STAGGER_MS = 30;
const DIGIT_ROLL_MS = 550;
const RAIL_MS = 350;
const COPIED_MS = 1500;

const formatChips = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

/** An odometer: each digit is a 0-9 strip moved with translateY. */
function RollingNumber({ value }: { value: string }) {
  const chars = Array.from(value);
  return (
    <span aria-hidden="true" className="inline-flex select-none tabular-nums">
      {chars.map((char, index) => {
        const fromRight = chars.length - index;
        const digit = Number.parseInt(char, 10);
        if (Number.isNaN(digit)) {
          return <span key={`s-${fromRight}`}>{char}</span>;
        }
        return (
          <span
            className="relative inline-block h-[1lh] overflow-hidden"
            key={`d-${fromRight}`}
          >
            <span className="invisible">0</span>
            <span
              className="absolute inset-x-0 top-0 flex flex-col motion-reduce:transition-none!"
              style={{
                transform: `translateY(${-digit * 10}%)`,
                transition: `transform ${DIGIT_ROLL_MS}ms ${EASE_OUT_CSS} ${(fromRight - 1) * DIGIT_STAGGER_MS}ms`,
              }}
            >
              {"0123456789".split("").map((n) => (
                <span className="h-[1lh]" key={n}>
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Two labels in one cell, crossfading, so the line never shifts. */
function SwapLabel({ from, to, showTo }: { from: string; to: string; showTo: boolean }) {
  const face =
    "col-start-1 row-start-1 transition-[opacity,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-[opacity]";
  return (
    <span aria-hidden="true" className="inline-grid">
      <span className={cn(face, showTo && "opacity-0 blur-[3px]")}>{from}</span>
      <span className={cn(face, !showTo && "opacity-0 blur-[3px]")}>{to}</span>
    </span>
  );
}

type StepState = "done" | "active" | "pending" | "failed";

function StepNode({ state }: { state: StepState }) {
  return (
    <span className="relative flex size-5 shrink-0 items-center justify-center">
      <span
        className={cn(
          "absolute inset-0 rounded-full border-[1.5px] transition-colors duration-200 ease-out",
          (state === "pending" || state === "active") && "border-zinc-700",
          state === "done" && "border-zinc-100 bg-zinc-100",
          state === "failed" && "border-red-500 bg-red-500"
        )}
      />
      {state === "active" && (
        <span
          className="absolute inset-0 animate-[fc-st-in_200ms_ease-out_both] motion-reduce:animate-none"
          style={{ animationDelay: `${RAIL_MS - 100}ms` }}
        >
          <svg
            aria-hidden="true"
            className="size-full animate-spin text-zinc-100 [animation-duration:750ms] motion-reduce:animate-none"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path d="M10 1.25A8.75 8.75 0 0 1 18.75 10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
          </svg>
        </span>
      )}
      {state === "done" && (
        <svg aria-hidden="true" className="relative size-3 text-zinc-900" fill="none" viewBox="0 0 12 12">
          <path
            className="animate-[fc-st-draw_300ms_cubic-bezier(0.23,1,0.32,1)_both] motion-reduce:animate-none"
            d="M2.5 6.25 5 8.5l4.5-5"
            pathLength={1}
            stroke="currentColor"
            strokeDasharray="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
          />
        </svg>
      )}
      {state === "failed" && <XIcon aria-hidden="true" className="relative size-3 text-white" strokeWidth={3} />}
    </span>
  );
}

function RefId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  const icon = "col-start-1 row-start-1 size-3 transition-[opacity,filter] duration-150 ease-out";
  return (
    <button
      aria-label={copied ? "Reference copied" : `Copy reference ${id}`}
      className="-mx-1.5 -my-1 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-mono text-zinc-300 transition-colors duration-150 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-400/50"
      onClick={() => {
        navigator.clipboard?.writeText(id).then(() => setCopied(true)).catch(() => {});
      }}
      type="button"
    >
      {id}
      <span aria-hidden="true" className="grid size-3 place-items-center">
        <CopyIcon className={cn(icon, copied ? "opacity-0 blur-[2px]" : "opacity-60")} />
        <CheckIcon
          className={cn(icon, "text-emerald-400", copied ? "opacity-100" : "opacity-0 blur-[2px]")}
          strokeWidth={3}
        />
      </span>
    </button>
  );
}

const STATUSES: TrackerStatus[] = ["processing", "completed", "failed"];
const PILL_CLASS: Record<TrackerStatus, string> = {
  processing: "bg-zinc-800 text-zinc-300",
  completed: "bg-emerald-400/10 text-emerald-300",
  failed: "bg-red-400/10 text-red-300",
};
const PILL_LABEL: Record<TrackerStatus, string> = {
  processing: "In progress",
  completed: "Settled",
  failed: "Void",
};

/** Steps done so far; runs a step at a time and waits on the last one. */
function useProgress(status: TrackerStatus, waitAt: number, total: number, stepMs: number) {
  const [progress, setProgress] = useState(FIRST_DONE);
  const [runFor, setRunFor] = useState(status);
  if (runFor !== status) {
    setRunFor(status);
    if (status === "processing") setProgress(FIRST_DONE);
  }
  useEffect(() => {
    if (status !== "processing" || progress >= waitAt) return;
    const timer = setTimeout(() => setProgress((p) => p + 1), stepMs);
    return () => clearTimeout(timer);
  }, [status, progress, waitAt, stepMs]);
  return status === "completed" ? total : progress;
}

export default function StepTracker({
  title,
  subtitle,
  initials,
  accent,
  amount,
  unit = "chips",
  convertAt = 2,
  caption,
  steps,
  failed = { title: "Couldn't complete", detail: "All chips refunded" },
  pill,
  refId,
  footerNote,
  status,
  stepMs = 1100,
  loopMs = 4000,
  className,
}: StepTrackerProps) {
  const isControlled = status !== undefined;
  const [demoStatus, setDemoStatus] = useState<TrackerStatus>("processing");
  const current = status ?? demoStatus;
  const waitAt = steps.length - 1;
  const done = useProgress(current, waitAt, steps.length, stepMs);

  // Demo only: finish on the last step, then start over after a pause.
  useEffect(() => {
    if (isControlled) return;
    if (current === "processing" && done >= waitAt) {
      const timer = setTimeout(() => setDemoStatus("completed"), stepMs);
      return () => clearTimeout(timer);
    }
    if (current === "completed" && loopMs > 0) {
      const timer = setTimeout(() => setDemoStatus("processing"), loopMs);
      return () => clearTimeout(timer);
    }
  }, [isControlled, current, done, waitAt, stepMs, loopMs]);

  const converted = done >= convertAt;
  const shown = converted ? amount.to : amount.from;
  const settled = current === "completed";
  const labels = { ...PILL_LABEL, ...pill };

  const stateOf = (index: number): StepState => {
    if (index < done) return "done";
    if (index === done) return current === "failed" ? "failed" : "active";
    return "pending";
  };

  return (
    <div
      className={cn(
        "w-full rounded-2xl bg-zinc-900 p-5 ring-1 ring-zinc-800",
        "shadow-[0_1px_2px_rgb(0_0_0/0.3),0_8px_24px_-12px_rgb(0_0_0/0.6)]",
        className
      )}
    >
      <style>
        {"@keyframes fc-st-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes fc-st-in{from{opacity:0;filter:blur(2px)}}"}
      </style>
      <output aria-live="polite" className="sr-only">
        {settled && `${title}: settled.`}
        {current === "failed" && `${title}: ${failed.title}.`}
        {current === "processing" && steps[Math.min(done, waitAt)].title}
      </output>

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full font-semibold text-xs text-zinc-950"
          style={{ backgroundColor: accent ?? "#3f3f46" }}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-medium text-sm text-zinc-100">{title}</p>
          <p className="truncate text-xs text-zinc-400">{subtitle}</p>
        </div>
        <span
          className={cn(
            "inline-grid h-6 shrink-0 items-center rounded-full px-2 font-medium text-[11px] transition-colors duration-200 ease-out",
            PILL_CLASS[current]
          )}
        >
          {STATUSES.map((key) => (
            <span
              aria-hidden={key !== current}
              className={cn(
                "col-start-1 row-start-1 text-center transition-[opacity,filter] duration-200 ease-out motion-reduce:transition-[opacity]",
                key === current ? "opacity-100" : "opacity-0 blur-[2px]"
              )}
              key={key}
            >
              {labels[key]}
            </span>
          ))}
        </span>
      </div>

      <div className="mt-5">
        <p className="font-medium text-[11px] text-zinc-500 uppercase tracking-wider">
          <SwapLabel from={amount.fromLabel} showTo={converted} to={amount.toLabel} />
        </p>
        <p className="mt-1 font-semibold text-4xl text-zinc-50 tracking-tight">
          <span className="sr-only">{formatChips(shown)} {unit}</span>
          <RollingNumber value={formatChips(shown)} />
          <span className="ml-1.5 font-medium text-base text-zinc-500">{unit}</span>
        </p>
        <p className="mt-1 text-xs text-zinc-400 tabular-nums">{caption}</p>
      </div>

      <ol className="mt-5">
        {steps.map((step, index) => {
          const state = stateOf(index);
          const last = index === steps.length - 1;
          const stepTitle = state === "done" && step.doneTitle ? step.doneTitle : step.title;
          const stepDetail = state === "done" && step.doneDetail ? step.doneDetail : step.detail;
          return (
            <li className="flex gap-3" key={step.id}>
              <div className="flex flex-col items-center">
                <StepNode state={state} />
                {!last && (
                  <span className="relative my-1 w-[1.5px] flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <span
                      className={cn(
                        "absolute inset-0 origin-top bg-zinc-100 transition-[scale] motion-reduce:transition-none",
                        index < done ? "scale-y-100" : "scale-y-0"
                      )}
                      style={{ transitionDuration: `${RAIL_MS}ms`, transitionTimingFunction: EASE_IN_OUT_CSS }}
                    />
                  </span>
                )}
              </div>
              <div className={cn("min-w-0 flex-1", !last && "pb-3.5")}>
                <p
                  className={cn(
                    "text-sm leading-5 transition-colors duration-200 ease-out",
                    state === "pending" ? "text-zinc-500" : "text-zinc-100",
                    state === "failed" && "text-red-400"
                  )}
                >
                  <span
                    className="block animate-[fc-st-in_200ms_ease-out_both] motion-reduce:animate-none"
                    key={state === "failed" ? "failed" : stepTitle}
                  >
                    {state === "failed" ? failed.title : stepTitle}
                  </span>
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-xs tabular-nums transition-colors duration-200 ease-out",
                    state === "pending" ? "text-zinc-600" : "text-zinc-400"
                  )}
                >
                  <span
                    className="block animate-[fc-st-in_200ms_ease-out_both] motion-reduce:animate-none"
                    key={state === "failed" ? "failed" : stepDetail}
                  >
                    {state === "failed" ? failed.detail : stepDetail}
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex items-center justify-between border-zinc-800 border-t pt-4 text-xs">
        <RefId id={refId} />
        <span className="text-zinc-500">{footerNote}</span>
      </div>
    </div>
  );
}
