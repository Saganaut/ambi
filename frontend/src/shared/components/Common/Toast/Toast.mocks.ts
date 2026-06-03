import type { ToastItem, ToastVariant } from "./ToastTypes";

export const TOAST_VARIANTS: ToastVariant[] = [
  "success",
  "error",
  "warning",
  "info",
];

export const sampleToasts: ToastItem[] = [
  { id: "t-success", message: "Deck saved.", variant: "success", duration: 0 },
  { id: "t-error", message: "Could not reach the server.", variant: "error", duration: 0 },
  { id: "t-warning", message: "You have unsaved changes.", variant: "warning", duration: 0 },
  { id: "t-info", message: "A new version is available.", variant: "info", duration: 0 },
];
