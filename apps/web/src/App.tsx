import { useEffect } from "react";
import { BrowserRouter, useParams, useRoutes, useSearchParams, type RouteObject } from "react-router-dom";
import { ArenaCanvas } from "@/arena";
import { DebugPanel } from "@/data/DebugPanel";
import { stopReplay, useStore } from "@/data/store";
import { routes } from "@/ui";
import { installAudio } from "@/audio";

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

// HEAD-owned route (PRD §8.7 / K-06): plays a fixture through the store and mounts the arena.
function ReplayRoute() {
  const { name = "mock-basic" } = useParams();
  const [q] = useSearchParams();
  const speed = Number(q.get("speed")) || 1;
  useEffect(() => {
    useStore.getState().openReplay(name, speed);
    return () => stopReplay();
  }, [name, speed]);
  return (
    <div style={{ background: "#000", minHeight: "100vh" }}>
      <ArenaCanvas reducedMotion={prefersReducedMotion()} />
      {q.get("debug") === "1" && <DebugPanel />}
    </div>
  );
}

const headRoutes: RouteObject[] = [{ path: "/replay/:name", element: <ReplayRoute /> }];

function Routes() {
  return useRoutes([...headRoutes, ...routes()]);
}

export default function App() {
  useEffect(() => installAudio(), []);   // O6 SFX on cues$ (muted by default on phones)
  return (
    <BrowserRouter>
      <Routes />
    </BrowserRouter>
  );
}
