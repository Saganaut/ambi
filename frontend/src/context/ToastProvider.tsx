import { createContext, useCallback, useState, type ReactNode } from "react";
import { Toast, ToastContainer } from "../components/Common/Toast/Toast";
import type {
  ToastConfig,
  ToastItem,
} from "../components/Common/Toast/ToastTypes";

export interface ToastContextValue {
  addToast: (config: ToastConfig) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((config: ToastConfig) => {
    const toast: ToastItem = {
      id: String(nextId++),
      message: config.message,
      variant: config.variant ?? "info",
      duration: config.duration ?? 4000,
    };
    setToasts((prev) => [...prev, toast]);
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
