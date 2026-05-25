import { use } from "react";
import { ToastContext, type ToastContextValue } from "./ToastProvider";

export function useToast(): ToastContextValue {
  const ctx = use(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
