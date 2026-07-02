import { XMarkIcon } from "@heroicons/react/24/outline";
import type { ToastItem } from "./Toast.types";
import styles from "./Toast.module.css";
import { IconBtn } from "../Buttons/IconBtn";

interface ToastProps extends ToastItem {
  onDismiss: (id: string) => void;
}

const Toast = ({ id, message, variant, onDismiss }: ToastProps) => {
  return (
    <div
      className={[styles.toast, styles[variant]].join(" ")}
      role='alert'
      aria-live='polite'
      aria-atomic='true'>
      <span className={styles.message}>{message}</span>
      <div className={styles.closeBtn}>
        <IconBtn
          fill='ghost'
          icon={<XMarkIcon />}
          size='xs'
          className={styles.dismiss}
          aria-label='Dismiss notification'
          onClick={() => {
            onDismiss(id);
          }}></IconBtn>
      </div>
    </div>
  );
};

const ToastContainer = ({ children }: { children: React.ReactNode }) => (
  <div className={styles.toastContainer} aria-label='Notifications'>
    {children}
  </div>
);

export { Toast, ToastContainer };
