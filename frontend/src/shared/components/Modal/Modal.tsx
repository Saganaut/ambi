// Dialog-element-based modal. Optional variant maps to a className modifier
// in Modal.module.css that tints the dialog frame. Inner header / content keep
// their own surface tokens, so changing variant retints frame + edges only.
import { useEffect, useRef, type ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import style from "./Modal.module.css";
import { Btn } from "@saganaut/ambi-ui";

type ModalVariant = "error" | "success" | "warning" | "info" | "brand";

interface ModalProps {
  children: ReactNode;
  title?: string;
  variant?: ModalVariant;
  // Request a close (X button, backdrop click, Escape). The provider responds
  // by flipping `closing` rather than unmounting immediately.
  onClose: () => void;
  // Provider-driven exit flag: while true the dialog plays its fade-out.
  closing?: boolean;
  // Fired once the fade-out finishes, telling the provider it's safe to unmount.
  onClosed?: () => void;
}

const Modal = ({
  children,
  title,
  variant,
  onClose,
  closing = false,
  onClosed,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // Guard against a second showModal() on an already-open dialog: React
    // StrictMode double-invokes this effect in dev, and re-asserting the dialog
    // into the top layer mid-view-transition (the router runs with
    // defaultViewTransition) aborts it — the "open, shrink, reopen" flash.
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    if (!closing || !onClosed) return;
    // Safety net: if transitionend never fires (reduced motion, an interrupted
    // view transition), still unmount once the fade would have finished. Derive
    // the delay from the dialog's own transition-duration so it tracks the CSS
    // token (--duration-fast) instead of hard-coding it; small buffer for the
    // event round-trip.
    const dialog = dialogRef.current;
    const durationMs = dialog
      ? parseFloat(getComputedStyle(dialog).transitionDuration) * 1000
      : 0;
    const timer = setTimeout(onClosed, durationMs + 50);
    return () => clearTimeout(timer);
  }, [closing, onClosed]);

  function handleCancel(e: React.SyntheticEvent) {
    e.preventDefault();
    onClose();
  }

  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  function handleTransitionEnd(e: React.TransitionEvent<HTMLDialogElement>) {
    // Ignore the backdrop's own opacity transition (fires with the same target)
    // and any bubbled transitions from content inside the dialog.
    if (
      closing &&
      onClosed &&
      e.target === dialogRef.current &&
      !e.pseudoElement &&
      e.propertyName === "opacity"
    ) {
      onClosed();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleClick}
      onTransitionEnd={handleTransitionEnd}
      aria-labelledby={title ? "modal-title" : undefined}
      aria-modal='true'
      className={[style.modal, variant && style[variant], closing && style.closing]
        .filter(Boolean)
        .join(" ")}>
      <div className={style.header}>
        {title && (
          <h2 id='modal-title' className={style.title}>
            {title}
          </h2>
        )}
        <Btn
          fill='ghost'
          icon={<XMarkIcon />}
          aria-label='Close modal'
          onClick={onClose}
        />
      </div>
      <div className={style.content}>{children}</div>
    </dialog>
  );
};

export { Modal };
