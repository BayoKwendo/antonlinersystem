import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Dev keeps the same relative URLs the app uses in prod: proxy /api and the
    // /ws socket to the local backend so nothing hard-codes localhost:5002.
    proxy: {
      "/api": { target: "http://localhost:5002", changeOrigin: true },
      "/ws": { target: "ws://localhost:5002", ws: true },
    },
  },
});
