/// <reference types="vitest/config" />

import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import babel from "@rolldown/plugin-babel";
import svgr from "vite-plugin-svgr";
import { analyzer } from "vite-bundle-analyzer";

// Resolve a path relative to this config file (frontend root).
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Explicit aliases mirroring the `paths` in tsconfig.app.json. These are
// required (not just `resolve.tsconfigPaths`) because the native tsconfigPaths
// resolver fails to resolve aliases when the importer is a virtual module with
// a query string — e.g. TanStack Router's `?tsr-split=...` modules emitted by
// autoCodeSplitting — since our `paths` live in a referenced tsconfig rather
// than the root. See https://github.com/vitejs/vite/issues/21889.
// Keep this list in sync with tsconfig.app.json `compilerOptions.paths`.
// Order: most-specific first; the bare "@" (root "@/*") stays last.
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
    // "hidden" emits source maps (so Sentry can symbolicate prod stack traces
    // once wired) without appending the //# sourceMappingURL comment, keeping
    // them out of the shipped bundle. See z-docs/decisions/001-observability-stack.md.
    sourcemap: "hidden",
  },
  resolve: {
    alias,
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
