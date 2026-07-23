// PLACEHOLDER fallback — deliberately minimal. A designed error fallback
// lands in a later task; this just keeps a caught error from rendering
// nothing. Default `errorFallback` for AsyncBoundary's ErrorBoundary.
import styles from "./ErrorFallback.module.css";

interface ErrorFallbackProps {
  message?: string;
}

const ErrorFallback = ({ message }: ErrorFallbackProps) => (
  <div className={styles.errorFallback} role='alert'>
    {message ?? "Something went wrong loading this section."}
  </div>
);

export { ErrorFallback };
export type { ErrorFallbackProps };
