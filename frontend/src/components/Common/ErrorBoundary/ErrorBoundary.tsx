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
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { ServerErrorPage } from "@/pages/ErrorPage/ErrorPage";
import { logger } from "@/utils/logger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error("Unhandled React render error", {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <ServerErrorPage />;
    }
    return this.props.children;
  }
}
