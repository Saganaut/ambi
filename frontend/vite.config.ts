/// <reference types="vitest/config" />

import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import babel from "@rolldown/plugin-babel";
import svgr from "vite-plugin-svgr";
import { analyzer } from "vite-bundle-analyzer";

// https://vite.dev/config/

export default defineConfig({
  define: {
    global: "globalThis",
  },
  css: {
    devSourcemap: true,
  },
  build: {
    // "hidden" emits source maps (so Sentry can symbolicate prod stack traces
    // once wired) without appending the //# sourceMappingURL comment, keeping
    // them out of the shipped bundle. See z-docs/decisions/001-observability-stack.md.
    sourcemap: "hidden",
  },
  resolve: {
    tsconfigPaths: true,
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
  },
});
