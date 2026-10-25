import type { RouteObject } from "react-router-dom";
import { LeaderboardScreen } from "@/ui/leaderboard";

export const order = 40;
export const route: RouteObject = { path: "/leaderboard", element: <LeaderboardScreen /> };
