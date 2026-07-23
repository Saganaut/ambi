// Convenience composite for the common "lazy/async section" shape: an
// ErrorBoundary wrapping a Suspense boundary. Defaults to the PLACEHOLDER
// Loading/Error fallbacks — swap in designed ones per-callsite until a later
// task replaces the defaults themselves.
import { Suspense, type ReactNode } from "react";
import { ErrorFallback } from "@ui/BoundaryFallbacks/ErrorFallback";
import { LoadingFallback } from "@ui/BoundaryFallbacks/LoadingFallback";
import { ErrorBoundary } from "@ui/ErrorBoundary/ErrorBoundary";

interface AsyncBoundaryProps {
  children: ReactNode;
  boundaryName?: string;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
}

const AsyncBoundary = ({
  children,
  boundaryName,
  loadingFallback = <LoadingFallback />,
  errorFallback = <ErrorFallback />,
}: AsyncBoundaryProps) => (
  <ErrorBoundary fallback={errorFallback} boundaryName={boundaryName}>
    <Suspense fallback={loadingFallback}>{children}</Suspense>
  </ErrorBoundary>
);

export { AsyncBoundary };
export type { AsyncBoundaryProps };
