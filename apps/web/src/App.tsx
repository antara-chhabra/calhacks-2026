import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "@/pages/Landing";
import Markets from "@/pages/Markets";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Landing />} path="/" />
        <Route element={<Markets />} path="/markets" />
        <Route element={<Markets />} path="/markets/:category" />
        <Route element={<Landing />} path="*" />
      </Routes>
    </BrowserRouter>
  );
}
