import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Toast, ToastContainer } from "@ui/Toast/Toast";
import type {
  ToastConfig,
  ToastItem,
} from "@ui/Toast/Toast.types";

export interface ToastContextValue {
  addToast: (config: ToastConfig) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (config: ToastConfig) => {
      const toast: ToastItem = {
        id: String(nextId++),
        message: config.message,
        variant: config.variant ?? "info",
        duration: config.duration ?? 4000,
      };
      setToasts((prev) => [...prev, toast]);
      if (toast.duration !== 0) {
        timers.current.set(
          toast.id,
          setTimeout(() => dismissToast(toast.id), toast.duration),
        );
      }
    },
    [dismissToast],
  );

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <ToastContext value={{ addToast, dismissToast }}>
      {children}
      {toasts.length > 0 && (
        <ToastContainer>
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onDismiss={dismissToast} />
          ))}
        </ToastContainer>
      )}
    </ToastContext>
  );
};

export { ToastContext };
export { ToastProvider };
