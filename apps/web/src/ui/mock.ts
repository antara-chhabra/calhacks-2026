// Shared UI shapes. The mock market data this file used to hold is replaced by the store (src/ui/lobby/selectors.ts).
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

export const CATEGORIES: Record<string, { name: string }> = {
  "/markets": { name: "Trending" },
  "/markets/integrals": { name: "Integrals" },
  "/markets/code": { name: "Code duels" },
  "/markets/speed-math": { name: "Speed math" },
  "/markets/logic": { name: "Logic" },
  "/markets/chess": { name: "Chess" },
  "/markets/trivia": { name: "Trivia" },
  "/markets/live-web": { name: "Live web" },
  "/markets/squads": { name: "Squads" },
};
