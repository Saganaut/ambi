// PLACEHOLDER fallback — deliberately minimal. Reuses Loader as-is; a
// designed loading fallback lands in a later task. Default `loadingFallback`
// for AsyncBoundary's Suspense boundary.
import { Loader } from "@ui/Loader/Loader";

interface LoadingFallbackProps {
  message?: string;
}

const LoadingFallback = ({ message }: LoadingFallbackProps) => (
  <Loader message={message} />
);

export { LoadingFallback };
export type { LoadingFallbackProps };
