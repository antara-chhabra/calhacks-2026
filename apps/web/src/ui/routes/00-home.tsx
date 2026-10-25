// Landing (Flow Field entry). Route files are collected by ui/index.ts; `order` sorts them, lower first.
import type { RouteObject } from "react-router-dom";
import Landing from "@/pages/Landing";

export const order = 0;
export const route: RouteObject = { path: "/", element: <Landing /> };
