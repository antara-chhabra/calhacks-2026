// Shared UI shapes. The mock market data this file used to hold is replaced by the store (src/ui/lobby/selectors.ts).
import { CATEGORY_CATALOG } from "@fc/contracts";
export interface Agent {
  id: string;
  name: string;
  title: string;
  category: string;
  color: string;
  origin: "House" | "Community";
  elo: number;
  winPct: number;
  change: number;
  odds: number;
  form: ("W" | "P" | "L")[];
  trend: number[];
  streak: string;
  blurb: string;
}

export const CATEGORIES = Object.fromEntries(CATEGORY_CATALOG.map((c) => [c.path, { name: c.label }])) as Record<string, { name: string }>;
