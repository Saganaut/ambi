// Promise-based imperative confirm() API. Resolves to true/false depending on
// which button the user clicks, or false if the user dismisses the modal.
import { useCallback, type ReactNode } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { useModal } from "@/shared/hooks/useModal";

interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
}

const useConfirm = () => {
  const { openModal, closeModal } = useModal();

  return useCallback(
    (opts: ConfirmOptions): Promise<boolean> =>
      new Promise((resolve) => {
        const finish = (result: boolean) => {
          closeModal();
          resolve(result);
        };
        openModal({
          title: opts.title,
          content: (
            <ConfirmDialog
              message={opts.message}
              confirmLabel={opts.confirmLabel}
              cancelLabel={opts.cancelLabel}
              variant={opts.variant}
              onConfirm={() => {
                finish(true);
              }}
              onCancel={() => {
                finish(false);
              }}
            />
          ),
        });
      }),
    [openModal, closeModal],
  );
};

export { useConfirm };
