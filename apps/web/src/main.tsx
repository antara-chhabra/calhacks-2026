import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";

// Phones scanning the QR land on /m (FC-F-220/222): load only the mobile page, not the arena (Pixi) or the full app.
const root = createRoot(document.getElementById("root") as HTMLElement);
const entry = /^\/m\/?$/.test(window.location.pathname) ? import("@/mobile-entry") : import("@/App");
void entry.then(({ default: Root }) =>
  root.render(
    <StrictMode>
      <Root />
    </StrictMode>
  )
);
