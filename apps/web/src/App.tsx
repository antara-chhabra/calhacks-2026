import { BrowserRouter, useRoutes } from "react-router-dom";
import { routes } from "@/ui";

function Routes() {
  return useRoutes(routes());
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes />
    </BrowserRouter>
  );
}
