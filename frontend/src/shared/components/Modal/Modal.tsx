// Dialog-element-based modal. Optional variant maps to a className modifier
// in Modal.module.css that tints the dialog frame. Inner header / content keep
// their own surface tokens, so changing variant retints frame + edges only.
import { useEffect, useRef, type ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import style from "./Modal.module.css";
import { IconBtn } from "../Common/Buttons/IconBtn";

type ModalVariant = "error" | "success" | "warning" | "info" | "brand";

interface ModalProps {
  children: ReactNode;
  title?: string;
  variant?: ModalVariant;
  onClose: () => void;
}

const Modal = ({ children, title, variant, onClose }: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleCancel(e: React.SyntheticEvent) {
    e.preventDefault();
    onClose();
  }

  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleClick}
      aria-labelledby={title ? "modal-title" : undefined}
      aria-modal='true'
      className={[style.modal, variant && style[variant]]
        .filter(Boolean)
        .join(" ")}>
      <div className={style.header}>
        {title && (
          <h2 id='modal-title' className={style.title}>
            {title}
          </h2>
        )}
        <IconBtn
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
