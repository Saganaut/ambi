/// <reference types="vitest/config" />

import babel from "@rolldown/plugin-babel";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { analyzer } from "vite-bundle-analyzer";
import svgr from "vite-plugin-svgr";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

const alias = [
  { find: "@sb", replacement: r("./.storybook") },
  { find: "@assets", replacement: r("./src/shared/assets") },
  { find: "@components", replacement: r("./src/shared/components") },
  { find: "@ui", replacement: r("./src/shared/components/UIElements") },
  { find: "@context", replacement: r("./src/shared/context") },
  { find: "@hooks", replacement: r("./src/shared/hooks") },
  { find: "@store", replacement: r("./src/shared/store") },
  { find: "@types", replacement: r("./src/shared/types") },
  { find: "@utils", replacement: r("./src/shared/utils") },
  { find: "@shared", replacement: r("./src/shared") },
  { find: "@pages", replacement: r("./src/pages") },
  { find: "@routes", replacement: r("./src/routes") },
  { find: "@features", replacement: r("./src/features") },
  { find: "@deck", replacement: r("./src/features/deck") },
  { find: "@account", replacement: r("./src/features/account") },
  { find: "@liveSession", replacement: r("./src/features/liveSession") },
  { find: "@auth", replacement: r("./src/features/auth") },
  { find: "@", replacement: r("./src") },
];

// https://vite.dev/config/

export default defineConfig({
  define: {
    global: "globalThis",
  },
  css: {
    devSourcemap: true,
  },
  build: {
    sourcemap: "hidden",
  },
  resolve: {
    alias,
    tsconfigPaths: true,
    dedupe: ["react", "react-dom"],
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    svgr({ include: "**/*.svg?react" }),
    analyzer(),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    reporters: ["default", "junit", "json"],
    outputFile: {
      junit: "./test-results/junit.xml",
      json: "./test-results/results.json",
    },
  },
});
