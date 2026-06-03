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

  const openModal = useCallback((cfg: ModalConfig) => {
    setConfig(cfg);
  }, []);
  const closeModal = useCallback(() => {
    setConfig(null);
  }, []);

  return (
    <ModalContext value={{ openModal, closeModal }}>
      {children}
      {config && (
        <Modal title={config.title} onClose={closeModal}>
          {config.content}
        </Modal>
      )}
    </ModalContext>
  );
};

export { ModalContext };
export { ModalProvider };
