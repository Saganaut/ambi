// Drawing presentation + answer surface for the board. A single component
// covers every moment, switched by `mode`:
//   - prompt      → a participant gets the full DrawingCanvas (tools/palette
//                   from the slide config; prompt image beside the canvas or
//                   under the strokes as a trace layer, per promptPlacement).
//                   Submit rasterizes the canvas to a PNG, uploads it to the
//                   session's drawing store, then sends a DrawingAnswer that
//                   references the stored image. Host/projector sees the
//                   prompt image and a draw-on-your-device note instead.
//   - liveResults → still answerable pre-lock; the backend forces
//                   maxSelections=0 for drawings, so re-submitting overwrites
//                   (the button flips to "Update drawing").
//   - results     → drawing input locks. The submitted-drawings gallery rides
//                   the round-results work (next phase) — for now the board
//                   confirms the round is closed.
//
// The canvas is keyed by slideId so navigating rounds always starts a fresh
// drawing (its element state is component-internal).
import { useEffect, useRef, useState } from "react";
import type { SlideView } from "../../../store/liveSessionApi.gen";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
} from "@/shared/components/DrawingCanvas/DrawingCanvas";
import { Btn } from "@ui/Buttons/Btn";
import { extractErrorMessage } from "@utils/utils";
import type { BoardQuestionMode } from "../resolveBoardStage";
import styles from "./DrawingBoardContent.module.css";

interface DrawingBoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

type SubmitState = "idle" | "saving" | "submitted";

const DrawingBoardContent = ({ slide, mode, interactive }: DrawingBoardContentProps) => {
  const config = slide.drawing;
  const slideId = slide.id ?? "";

  const { sendAnswer, uploadDrawing } = useSessionConnection();
  // `mode` stays "prompt" for a LOCKED round; the phase tells closed-but-not-
  // revealed apart from a host projection of an open round.
  const { phase } = useLiveSessionQuery();
  const accepting = phase === "SUBMIT" || phase === "SUBMIT_LIVE";
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setSubmitState("idle");
    setError(null);
  }, [slideId]);

  const canDraw = interactive && accepting && mode !== "results";

  const tools = config?.tools ?? ["PEN"];
  const palette = tools.includes("COLOR_PALETTE") ? (config?.palette ?? []) : [];
  const promptUrl = config?.imagePromptUrl ?? undefined;
  const traceable = config?.promptPlacement === "BACKGROUND";

  const submit = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty || submitState === "saving" || !canDraw) return;
    setError(null);
    setSubmitState("saving");
    try {
      const blob = await canvas.exportPng();
      const image = await uploadDrawing(
        new File([blob], "drawing.png", { type: "image/png" }),
      );
      sendAnswer(slideId, { answerType: "DrawingAnswer", image });
      setSubmitState("submitted");
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Could not send your drawing. Please try again."));
      setSubmitState("idle");
    }
  };

  if (!canDraw) {
    // Host/projector (and everyone once the round closes): the prompt image
    // plus what to do — drawing happens on each participant's own device.
    return (
      <div className={styles.drawingBoardContent}>
        {promptUrl && <img className={styles.prompt} src={promptUrl} alt='' />}
        <p className={styles.note}>
          {accepting
            ? "Draw your answer on your own device."
            : "Drawings are in — this round is closed."}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.drawingBoardContent}>
      <div className={styles.workspace}>
        {promptUrl && !traceable && (
          <img className={styles.prompt} src={promptUrl} alt='Prompt image' />
        )}
        <div className={styles.canvasColumn}>
          <DrawingCanvas
            key={slideId}
            ref={canvasRef}
            palette={palette}
            allowEraser={tools.includes("ERASER")}
            allowShapes={tools.includes("SHAPES")}
            backgroundImageUrl={traceable ? promptUrl : undefined}
            ariaLabel='Your drawing'
            onEmptyChange={setIsEmpty}
          />
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        {submitState === "submitted" && (
          <p className={styles.sent}>Drawing sent — you can keep tweaking it.</p>
        )}
        <Btn
          variant='primary'
          disabled={isEmpty || submitState === "saving"}
          onClick={() => {
            void submit();
          }}>
          {submitState === "saving"
            ? "Sending…"
            : submitState === "submitted"
              ? "Update drawing"
              : "Submit drawing"}
        </Btn>
      </div>
    </div>
  );
};

export { DrawingBoardContent };
