import "@saganaut/ambi-ui/style.css";
import { createRouter } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { AppRouter } from "./AppRouter.tsx";
import "./index.css";
import { routeTree } from "./routeTree.gen.ts";
import { store } from "./shared/store/store.ts";
import { logger } from "./shared/utils/logger.ts";

// Last-resort capture for errors that escape React's tree (async callbacks,
// event handlers, rejected promises) — the ErrorBoundary only sees render-time
// throws. See z-docs/decisions/001-observability-stack.md.
window.addEventListener("error", (event) => {
  logger.error("Uncaught window error", {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
  });
});
window.addEventListener("unhandledrejection", (event) => {
  // View-transition races throw AbortError when a second navigation supersedes
  // an in-flight transition — harmless, not a real error.
  if (event.reason?.name === "AbortError") return;
  logger.error("Unhandled promise rejection", { reason: String(event.reason) });
});

const router = createRouter({
  routeTree,
  defaultViewTransition: true,
  // Preload a route's code chunk (and run its intent) when the user hovers /
  // focuses a <Link> — so the editor's JS is downloading before the click. RTK
  // Query owns data caching, so keep the router's own preload cache disabled
  // (staleTime 0) and warm the API cache separately (see usePrefetchDeckEditor).
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  context: {
    auth: { state: "loading" },
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export { router };

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <AppRouter router={router} />
      </Provider>
    </React.StrictMode>,
  );
}
