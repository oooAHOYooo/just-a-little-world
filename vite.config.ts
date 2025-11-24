import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    open: true,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 5173,
      clientPort: 5173
    }
  },
  build: {
    target: "es2020"
  },
  preview: {
    host: true,
    port: 4173
  }
});


