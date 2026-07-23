/**
 * App-level React error boundary.
 *
 * WHY THIS EXISTS: there was no error boundary anywhere, so a render-time throw
 * in any component unmounted the whole tree to a blank white screen with nothing
 * logged. This catches those crashes, logs them through the shared `logger`
 * (which carries to Sentry once wired), and shows the existing ServerErrorPage
 * instead of a blank page. TanStack Router's `errorComponent` covers loader/route
 * errors; this covers render errors in the React tree.
 * See z-docs/decisions/001-observability-stack.md.
 *
 * `fallback` lets scoped, non-root usages (e.g. AsyncBoundary) swap in a
 * localized fallback instead of the app-wide ServerErrorPage; `boundaryName`
 * tags the logged error so nested boundaries are distinguishable in logs.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { ServerErrorPage } from "@/pages/ErrorPage/ErrorPage";
import { logger } from "@utils/logger";

interface ErrorBoundaryProps {
  children: ReactNode;
  // Rendered instead of ServerErrorPage when provided. Lets nested boundaries
  // (see AsyncBoundary) show a scoped fallback instead of the app-wide one.
  fallback?: ReactNode;
  // Identifies which boundary caught the error in the logged context, so
  // nested boundaries are distinguishable in logs/Sentry.
  boundaryName?: string;
}

interface State {
  hasError: boolean;
}

// Rule 12 exception: class component is required — error boundaries must use
// getDerivedStateFromError/componentDidCatch, which have no hook equivalent.
class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error("Unhandled React render error", {
      boundaryName: this.props.boundaryName,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <ServerErrorPage />;
    }
    return this.props.children;
  }
}

export { ErrorBoundary };
export type { ErrorBoundaryProps };
