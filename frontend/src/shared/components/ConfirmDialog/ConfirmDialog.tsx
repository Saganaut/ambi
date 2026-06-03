// Confirm dialog body. Rendered inside the app's ModalProvider via the
// useConfirm() hook below. AGENTS.md forbids window.confirm/alert/prompt;
// this is the project's replacement.
//
// Two integration shapes:
//   1. <ConfirmDialog /> — controlled component for ad-hoc placements.
//   2. useConfirm() — promise-based imperative API: `await confirm({...})`.
import type { ReactNode } from "react";
import styles from "./ConfirmDialog.module.css";
import { Btn } from "../Common/Buttons/Btn";

interface ConfirmDialogProps {
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <div className={styles.body}>
    <div className={styles.message}>{message}</div>
    <div className={styles.actions}>
      <Btn fill='ghost' onClick={onCancel}>
        {cancelLabel}
      </Btn>
      <Btn
        variant={variant === "danger" ? "error" : "primary"}
        onClick={onConfirm}>
        {confirmLabel}
      </Btn>
    </div>
  </div>
);

export { ConfirmDialog };
export type { ConfirmDialogProps };
