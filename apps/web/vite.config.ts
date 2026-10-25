import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  envDir: path.resolve(__dirname, "../.."), // .env lives at the repo root (PRD §8.11)
  server: { port: Number(process.env.FC_WEB_PORT) || 5173 },
});
