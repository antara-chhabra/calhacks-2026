// O2 exports (PRD §8.7): routes() → RouteObject[]. App.tsx mounts these.
// Extension point (§17.4 rule 13): every file in ./routes exports `route` or `routes`, plus an optional numeric `order`.
// Add a screen by adding a file; never edit another screen's file. The catch-all goes last.
import { createElement } from "react";
import type { RouteObject } from "react-router-dom";
import Landing from "@/pages/Landing";

type RouteModule = { route?: RouteObject; routes?: RouteObject[]; order?: number };
const modules = import.meta.glob<RouteModule>("./routes/*.tsx", { eager: true });

export function routes(): RouteObject[] {
  const sorted = Object.entries(modules).sort(([a, ma], [b, mb]) => (ma.order ?? 50) - (mb.order ?? 50) || a.localeCompare(b));
  const list = sorted.flatMap(([, m]) => [...(m.route ? [m.route] : []), ...(m.routes ?? [])]);
  return [...list, { path: "*", element: createElement(Landing) }];
}
