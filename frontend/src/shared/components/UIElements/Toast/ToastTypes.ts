export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastConfig {
  message: string;
  variant?: ToastVariant;
  duration?: number; // ms; 0 = persistent; default 4000
}

export interface ToastItem extends Required<ToastConfig> {
  id: string;
}
