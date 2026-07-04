/**
 * Owns the single app-wide modal instance and its open/close lifecycle.
 *
 * `closeModal` flips a `closing` flag rather than unmounting so the Modal can
 * play its fade-out; `finishClose` (fired when the transition ends) does the
 * unmount. Keeping the flag here means every close path — the Modal's own
 * controls and content-level buttons that call `closeModal()` — fades out.
 */
import { createContext, useCallback, useState, type ReactNode } from "react";
import { Modal } from "../components/Modal/Modal";

interface ModalConfig {
  content: ReactNode;
  title?: string;
}

export interface ModalContextValue {
  openModal: (config: ModalConfig) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<ModalConfig | null>(null);
  // While true, the Modal plays its fade-out (see file header).
  const [closing, setClosing] = useState(false);

  const openModal = useCallback((cfg: ModalConfig) => {
    setConfig(cfg);
    setClosing(false);
  }, []);
  const closeModal = useCallback(() => {
    setClosing(true);
  }, []);
  const finishClose = useCallback(() => {
    setConfig(null);
    setClosing(false);
  }, []);

  return (
    <ModalContext value={{ openModal, closeModal }}>
      {children}
      {config && (
        <Modal
          title={config.title}
          onClose={closeModal}
          closing={closing}
          onClosed={finishClose}>
          {config.content}
        </Modal>
      )}
    </ModalContext>
  );
};

export { ModalContext };
export { ModalProvider };
