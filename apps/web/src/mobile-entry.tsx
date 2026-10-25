import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const MobilePage = lazy(() => import("@/ui/mobile/page"));

export default function MobileEntry() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ background: "#000", minHeight: "100vh" }} />}>
        <Routes>
          <Route path="/m" element={<MobilePage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
