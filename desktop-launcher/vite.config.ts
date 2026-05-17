import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import { resolve } from "path";

export default defineConfig({
  root: "renderer",
  base: "./",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  plugins: [
    react(),
    electron([
      {
        entry: "../electron/main/index.ts",
        onstart(options) {
          options.startup();
        },
        vite: {
          resolve: {
            alias: {
              "@lazplay/distribution/launcher": resolve(
                __dirname,
                "../packages/distribution/src/launcher.js",
              ),
            },
          },
          build: {
            outDir: "../dist-electron/main",
            rollupOptions: {
              external: ["better-sqlite3", "electron"],
            },
          },
        },
      },
      {
        entry: "../electron/preload/index.ts",
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: "../dist-electron/preload",
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "renderer/src"),
    },
  },
});
