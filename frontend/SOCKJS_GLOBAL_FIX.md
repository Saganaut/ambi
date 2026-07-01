# sockjs-client "global is not defined" Fix

## The Error

```text
sockjs-client.js Uncaught ReferenceError: global is not defined
```

## Why It Happens

`sockjs-client` (pulled in by Spring Boot's WebSocket/STOMP stack) was written for Node.js and references the `global` object directly. Browsers don't have `global` — they have `globalThis`. Vite does not polyfill `global` by default.

## The Fix

In `vite.config.ts`, add a `define` entry to map `global` to `globalThis`:

```ts
export default defineConfig({
  define: {
    global: "globalThis",
  },
  // ...rest of config
});
```

This makes Vite replace every reference to `global` with `globalThis` at build time, which browsers understand.

## Do Not Remove This

Every time `sockjs-client` (or any other Node-centric library) is bundled by Vite, this polyfill is required. Removing `define.global` from `vite.config.ts` will bring the error back immediately on page load.
