import type { RouteObject } from "react-router-dom";
import Markets from "@/pages/Markets";

export const order = 10;
export const routes: RouteObject[] = [
  { path: "/markets", element: <Markets /> },
  { path: "/markets/:category", element: <Markets /> },
];
