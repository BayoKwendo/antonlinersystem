import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// SMART Drill customer PWA. The manifest + service worker are hand-rolled static
// files in public/ (lighter than workbox; see public/manifest.webmanifest + sw.js).
// Same dev-proxy convention as the portal: /api and /ws go to the local backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": { target: "http://localhost:5002", changeOrigin: true },
      "/ws": { target: "ws://localhost:5002", ws: true },
    },
  },
});
