import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: false, // allow auto-fallback if 5173 is busy
    open: true
  },
  build: {
    target: "es2020"
  },
  preview: {
    host: true,
    port: 4173
  }
});


