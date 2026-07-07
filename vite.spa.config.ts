// SPA build config for packaging via Capacitor (offline Android APK).
// This does NOT touch the main SSR build used by Lovable — see vite.config.ts.
//
// Usage:
//   npm run build:spa   -> outputs static site into dist-spa/ with index.html
//   npx cap sync        -> point capacitor.config webDir at "dist-spa"
//
// The SPA entry (src/spa-main.tsx) mounts TanStack Router with hash history,
// which works from the file:// origin used by Capacitor WebView.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "node:path";

export default defineConfig({
  base: "./",
  plugins: [
    tsconfigPaths(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-spa",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index.spa.html"),
      output: {
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
});

