import { use } from "react";
import { ModalContext, type ModalContextValue } from "./ModalProvider";

export function useModal(): ModalContextValue {
  const ctx = use(ModalContext);
  if (!ctx) throw new Error("useModal must be used within a ModalProvider");
  return ctx;
}
