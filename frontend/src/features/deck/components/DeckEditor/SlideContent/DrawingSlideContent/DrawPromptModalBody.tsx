// Modal body for the author's "draw your own prompt image" flow: a full
// DrawingCanvas plus Cancel/Save. On save the canvas is rasterized to a PNG
// blob and handed to the caller (which ingests it into the gallery and slots
// it as the slide's imagePrompt); the caller closes the modal on success.
import { useRef, useState } from "react";

import { DrawingCanvas, type DrawingCanvasHandle } from "@/shared/components/DrawingCanvas/DrawingCanvas";
import { Btn } from "@ui/Buttons/Btn";
import { extractErrorMessage } from "@utils/utils";
import styles from "./DrawingSlideContent.module.css";

interface DrawPromptModalBodyProps {
  /** Swatches offered while drawing (the slide's palette, or the default). */
  palette: readonly string[];
  onSave: (blob: Blob) => Promise<void>;
  onCancel: () => void;
}

const DrawPromptModalBody = ({ palette, onSave, onCancel }: DrawPromptModalBodyProps) => {
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!canvasRef.current) return;
    setError(null);
    setIsSaving(true);
    try {
      await onSave(await canvasRef.current.exportPng());
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Could not save the drawing. Please try again."));
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.drawModalBody}>
      <DrawingCanvas
        ref={canvasRef}
        palette={palette}
        allowShapes
        ariaLabel='Prompt image drawing canvas'
        onEmptyChange={setIsEmpty}
      />
      {error && <p className={styles.drawModalError}>{error}</p>}
      <div className={styles.drawModalActions}>
        <Btn variant='secondary' fill='ghost' onClick={onCancel} disabled={isSaving}>
          Cancel
        </Btn>
        <Btn
          variant='primary'
          disabled={isEmpty || isSaving}
          onClick={() => {
            void save();
          }}>
          {isSaving ? "Saving…" : "Use drawing"}
        </Btn>
      </div>
    </div>
  );
};

export { DrawPromptModalBody };
