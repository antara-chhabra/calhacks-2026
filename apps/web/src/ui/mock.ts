// Mock market data for the UI until the SpacetimeDB bridge (src/data/**) lands.
// Names, colors and blurbs follow PRD §8.1; numbers are illustrative.

export interface Agent {
  id: string;
  name: string;
  title: string;
  category: string;
  color: string;
  origin: "House" | "Community";
  elo: number;
  winPct: number;
  /** In-market change over 24h, in percentage points of implied chance. */
  change: number;
  /** Decimal odds for the next match. */
  odds: number;
  /** Last five results, newest last. */
  form: ("W" | "P" | "L")[];
  /** Score % over the last 12 matches. */
  trend: number[];
  streak: string;
  blurb: string;
}

export const AGENTS: Agent[] = [
  { id: "sage", name: "SAGE", title: "The Monk", category: "Integrals", color: "#2EC4A6", origin: "House", elo: 1642, winPct: 70, change: 6.2, odds: 2.4, form: ["W", "W", "P", "W", "W"], trend: [52, 58, 55, 61, 64, 60, 67, 70, 68, 74, 72, 78], streak: "W3", blurb: "Verifies every answer before striking." },
  { id: "vex", name: "VEX", title: "The Villain", category: "Integrals", color: "#E5383B", origin: "House", elo: 1588, winPct: 55, change: -3.1, odds: 2.1, form: ["L", "W", "W", "L", "P"], trend: [70, 66, 72, 64, 61, 66, 58, 62, 55, 59, 54, 52], streak: "L1", blurb: "Swings first, checks never." },
  { id: "quill", name: "QUILL", title: "The Professor", category: "Integrals", color: "#3A6FF2", origin: "House", elo: 1561, winPct: 52, change: 1.4, odds: 3.6, form: ["P", "W", "L", "W", "P"], trend: [48, 50, 47, 53, 52, 55, 51, 54, 56, 53, 57, 58], streak: "P1", blurb: "In order, by the book." },
  { id: "brick", name: "BRICK", title: "The Wall", category: "Integrals", color: "#FF8A2B", origin: "House", elo: 1534, winPct: 48, change: 0.6, odds: 4.2, form: ["W", "L", "P", "P", "W"], trend: [44, 46, 45, 47, 49, 46, 48, 50, 49, 51, 50, 52], streak: "W1", blurb: "Re-derives once, never guesses." },
  { id: "pip", name: "PIP", title: "The Rookie", category: "Integrals", color: "#FFD23F", origin: "House", elo: 1497, winPct: 33, change: 9.8, odds: 9.5, form: ["L", "L", "W", "L", "W"], trend: [22, 25, 21, 28, 26, 30, 29, 35, 33, 38, 41, 46], streak: "W1", blurb: "Easy ones first, full send." },
  { id: "glitch", name: "GLITCH", title: "The Gremlin", category: "Integrals", color: "#8B5CF6", origin: "House", elo: 1452, winPct: 30, change: -5.4, odds: 5.8, form: ["L", "P", "L", "W", "L"], trend: [40, 34, 38, 31, 36, 29, 33, 27, 30, 25, 28, 24], streak: "L1", blurb: "Hardest first, guesses when stuck." },
];

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

export interface RecentBet {
  id: string;
  agent: string;
  market: string;
  stake: number;
  odds: number;
  status: "Open" | "Won" | "Lost" | "Refunded";
}

export const RECENT_BETS: RecentBet[] = [
  { id: "b1", agent: "sage", market: "SAGE to win · #43", stake: 200, odds: 2.4, status: "Open" },
  { id: "b2", agent: "pip", market: "PIP top 2 · #43", stake: 50, odds: 4.1, status: "Open" },
  { id: "b3", agent: "sage", market: "SAGE to win · #42", stake: 200, odds: 2.4, status: "Won" },
  { id: "b4", agent: "vex", market: "VEX first blood · #42", stake: 100, odds: 1.9, status: "Lost" },
  { id: "b5", agent: "glitch", market: "GLITCH to win · #41", stake: 40, odds: 5.8, status: "Refunded" },
];

export type HubInterest = "Match winners" | "Props" | "Head-to-head" | "Season futures" | "Specials";

export interface HubMarket {
  id: string;
  interest: HubInterest;
  question: string;
  meta: string;
  /** Binary markets: chance of Yes, 0-100. */
  chance?: number;
  /** Multi-outcome markets: agent id + chance. */
  outcomes?: { agent: string; chance: number }[];
  trend: number[];
  volume: number;
  span: number;
}

export const HUB_MARKETS: HubMarket[] = [
  { id: "m43", interest: "Match winners", question: "Who wins Match #43?", meta: "Integrals · closes in 1:12", outcomes: [{ agent: "sage", chance: 41 }, { agent: "vex", chance: 32 }, { agent: "pip", chance: 15 }, { agent: "glitch", chance: 12 }], trend: [30, 34, 33, 36, 38, 37, 41], volume: 64120, span: 3 },
  { id: "var", interest: "Props", question: "Will the VAR overturn a hit in #43?", meta: "Final check · 48 points", chance: 62, trend: [48, 51, 55, 53, 58, 60, 62], volume: 18240, span: 3 },
  { id: "fb", interest: "Props", question: "VEX lands first blood in #43?", meta: "First verified hit", chance: 38, trend: [46, 44, 45, 41, 40, 39, 38], volume: 9310, span: 2 },
  { id: "h2h", interest: "Head-to-head", question: "SAGE outscores VEX in #43?", meta: "Points after VAR", chance: 57, trend: [50, 52, 51, 54, 55, 56, 57], volume: 12780, span: 2 },
  { id: "red", interest: "Specials", question: "Any red card in #43?", meta: "Referee sandbox", chance: 9, trend: [12, 11, 10, 11, 9, 10, 9], volume: 4020, span: 2 },
  { id: "s1", interest: "Season futures", question: "Season 1 champion", meta: "Highest Elo at season end", outcomes: [{ agent: "sage", chance: 46 }, { agent: "quill", chance: 21 }, { agent: "vex", chance: 19 }, { agent: "pip", chance: 8 }], trend: [38, 40, 41, 43, 44, 45, 46], volume: 88400, span: 3 },
  { id: "upset", interest: "Specials", question: "A 5×+ underdog wins today?", meta: "Any match · today", chance: 27, trend: [18, 20, 22, 21, 24, 26, 27], volume: 7150, span: 3 },
];

/** Seeded daily chips history for the insights card: winnings, daily chips, refunds. */
export function chipsHistory(days: number, end: string) {
  let seed = 11;
  const random = () => {
    seed = (seed * 16_807) % 2_147_483_647;
    return seed / 2_147_483_647;
  };
  const last = Date.parse(`${end}T00:00:00Z`);
  const out: { date: string; parts: number[] }[] = [];
  let skill = 120;
  for (let i = 0; i < days; i++) {
    const t = last - (days - 1 - i) * 86_400_000;
    skill += 0.6 + (random() - 0.45) * 8;
    const upsetDay = i === days - 9;
    out.push({
      date: new Date(t).toISOString().slice(0, 10),
      parts: [
        Math.max(0, Math.round(skill * (0.6 + random() * 0.8) * (upsetDay ? 3.2 : 1))),
        250,
        Math.round(random() < 0.15 ? 40 + random() * 120 : 0),
      ],
    });
  }
  return out;
}

export const agentById = (id: string) => AGENTS.find((a) => a.id === id) ?? AGENTS[0];
