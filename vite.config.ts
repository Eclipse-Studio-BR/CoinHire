import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Robust __dirname for ESM (works in Node/Vite/Vercel)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay({
      filter(error) {
        // Ignore runtime errors originating from browser extensions (e.g. MetaMask)
        if (error.message?.includes("Cannot redefine property: ethereum")) return false;
        if (error.stack?.includes("chrome-extension://")) return false;
        return true;
      },
    }),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          // keep your Replit-only plugins exactly as before
          await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
          await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  // client source lives in /client
  root: path.resolve(__dirname, "client"),
  // build output goes to repoRoot/dist/public (what Vercel will serve)
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});