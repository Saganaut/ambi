/**
 * Author surface for a Drawing slide (DrawingContent) — the open-canvas,
 * survey-style kind: players freehand-draw on a fixed 1:1 canvas and submit
 * a rendered PNG. There is no static answer key (typically paired with a
 * best-answer-vote follow-up), so this surface has no scoring knobs.
 *
 * Layout:
 *   - Prompt at the top (stored on the slide title, like TEXT/MCQ).
 *   - "Prompt image" card: optional image players see with the canvas —
 *     choose from the gallery, or draw one right here (DrawingCanvas in the
 *     global modal → PNG → gallery ingest). A placement radio decides
 *     whether players see it beside the canvas or under their strokes as a
 *     traceable layer.
 *   - "Correct answer image" card: the author's own picture of the right
 *     answer (`correctImage`). It changes nothing about the Drawing round —
 *     players never see it here — but it is what a `SPOT_THE_ANSWER`
 *     follow-up seeds onto its board among the players' drawings, so setting
 *     one is what unlocks that mode on this slide.
 *   - "Canvas tools" card: which tools players get (pen is always on) and
 *     the stroke-color palette (shown while COLOR_PALETTE is enabled).
 *
 * Removing the correct-answer image is blocked (no remove control, no PUT
 * fired) while a keyed follow-up is attached — the backend 400s that content
 * transition, and `updateSlide`'s fire-and-forget PUT can't surface a
 * rejection, so `wouldOrphanKeyedFollowUp` catches it client-side first.
 * Replacing it stays allowed: the follow-up keeps an answer to hide either way.
 */
import { useState } from "react";

import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { RadioGroup } from "@components/Forms/Input/RadioGroup/RadioGroup";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { useDrawingEditor } from "@deck/hooks/useDrawingEditor";
import { useSlide } from "@deck/hooks/useSlide";
import type { PromptPlacement, Tool } from "@deck/store/deckEnums.gen";
import { wouldOrphanKeyedFollowUp } from "@deck/utils/followUp";
import { DEFAULT_DRAWING_PALETTE } from "@deck/utils/slideContent";
import { useModal } from "@hooks/useModal";
import { Btn } from "@ui/Buttons/Btn";
import { isImageEmpty, largestUrl } from "@utils/image";
import { EmptySelect } from "../_shared";
import type { SlideContentProps } from "../slideContentProps";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import styles from "./DrawingSlideContent.module.css";
import { DrawPromptModalBody } from "./DrawPromptModalBody";
import { PaletteEditor } from "./PaletteEditor";

/** The player-facing tool toggles this surface offers (PEN is always on). */
const TOOL_TOGGLES: { tool: Tool; label: string }[] = [
  { tool: "ERASER", label: "Eraser" },
  { tool: "SHAPES", label: "Shapes" },
  { tool: "COLOR_PALETTE", label: "Color palette" },
];

const DrawingSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useDrawingEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker();
  const { openModal, closeModal } = useModal();
  // Needed only to check whether an attached keyed follow-up would be orphaned
  // by clearing the correct-answer image (see `answerImageLocked` below).
  const { slides, getSlide } = useSlide(deckId);

  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [palette, setPalette] = useState<string[]>(question?.palette ?? []);
  const [syncedFromId, setSyncedFromId] = useState(question?.id);
  // Resync the local mirrors when the active slide changes ("derive state
  // during render" — safe when the new value differs).
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setPalette(question.palette);
  }

  if (!question) return <EmptySelect title="Drawing" />;

  const imageUrl = isImageEmpty(question.imagePrompt)
    ? null
    : largestUrl(question.imagePrompt, question.id);
  const hasImage = imageUrl != null;
  const correctImageUrl = isImageEmpty(question.correctImage)
    ? null
    : largestUrl(question.correctImage, `${question.id}-answer`);
  const hasCorrectImage = correctImageUrl != null;
  const hasPaletteTool = question.tools.includes("COLOR_PALETTE");

  // Would dropping the answer image strip the last authored answer out from
  // under an attached "Spot the answer" follow-up? The backend rejects that
  // content transition with 400, and the slide-update path that would carry it
  // fires fire-and-forget with no rollback — so this is a client-side guard,
  // not just a UX nicety. Replacing the image is never blocked.
  const slide = getSlide(slideId);
  const content = slide?.content;
  const answerImageLocked =
    hasCorrectImage &&
    slide !== undefined &&
    content?.contentType === "DRAWING" &&
    wouldOrphanKeyedFollowUp(slide, slides, { ...content, correctImage: undefined });

  const pickImage = () => {
    editor.flush();
    // Prompt images are square: BACKGROUND lays one under the strokes on the
    // 1:1 canvas, so anything else would be clipped there and mismatch the
    // drawn-here path. Uploads and gallery picks alike crop to that frame.
    openPicker(editor.setImagePrompt, {
      title: "Prompt image",
      cropWidth: 1,
      cropHeight: 1,
      cropGalleryPicks: true,
    });
  };

  const drawImage = () => {
    editor.flush();
    openModal({
      title: "Draw the prompt image",
      content: (
        <DrawPromptModalBody
          palette={palette.length > 0 ? palette : DEFAULT_DRAWING_PALETTE}
          onCancel={closeModal}
          onSave={async (blob) => {
            await editor.saveDrawnPrompt(blob);
            closeModal();
          }}
        />
      ),
    });
  };

  const pickCorrectImage = () => {
    editor.flush();
    // Same 1:1 frame as the prompt image, for a different reason: this picture
    // is shown beside the players' drawings on the follow-up board, which are
    // square exports of the square canvas. Anything else would be the one card
    // with a different aspect ratio — a tell as good as a label.
    openPicker(editor.setCorrectImage, {
      title: "Correct answer image",
      cropWidth: 1,
      cropHeight: 1,
      cropGalleryPicks: true,
    });
  };

  const drawCorrectImage = () => {
    editor.flush();
    openModal({
      title: "Draw the correct answer",
      content: (
        <DrawPromptModalBody
          palette={palette.length > 0 ? palette : DEFAULT_DRAWING_PALETTE}
          ariaLabel="Correct answer drawing canvas"
          onCancel={closeModal}
          onSave={async (blob) => {
            await editor.saveDrawnCorrectImage(blob);
            closeModal();
          }}
        />
      ),
    });
  };

  return (
    <SlideWrapper
      className={styles.drawingSlideContent}
      prompt={{
        idBase: `draw-${question.id}`,
        value: prompt,
        placeholder: "Ask players to draw something…",
        onChange: (html) => {
          setPrompt(html);
          editor.schedulePrompt(html);
        },
        onBlur: editor.flush,
      }}
      footer={
        <p>
          Players draw on a square canvas and their pictures are collected — pair this slide with a
          follow-up to vote for the best one, or add a correct answer image and let the room spot it
          among the drawings.
        </p>
      }
    >
      <SlideContent>
        <SlideContentSection>
          <SlideContentSection.Header>
            <span>Prompt image</span>
            <span className={styles.imageActions}>
              <Btn variant="secondary" size="sm" onClick={pickImage}>
                {hasImage ? "Replace image" : "Choose image"}
              </Btn>
              <Btn variant="secondary" size="sm" onClick={drawImage}>
                Draw one
              </Btn>
              {hasImage && (
                <Btn variant="error" fill="ghost" size="sm" onClick={editor.clearImagePrompt}>
                  Remove
                </Btn>
              )}
            </span>
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            {hasImage ? (
              <div className={styles.imageSection}>
                {" "}
                <img
                  className={styles.imagePreview}
                  src={imageUrl}
                  alt={question.imagePrompt?.altText ?? "Prompt image"}
                />
                <RadioGroup
                  name={`draw-placement-${question.id}`}
                  legend="Players see it"
                  options={[
                    { value: "ALONGSIDE", label: "Beside the canvas" },
                    { value: "BACKGROUND", label: "On the canvas, traceable" },
                  ]}
                  value={question.promptPlacement}
                  disabled={!hasImage}
                  onChange={(value) => {
                    editor.setPromptPlacement(value as PromptPlacement);
                  }}
                />{" "}
              </div>
            ) : (
              <p className={styles.imageHint}>
                Optional — give players an image to look at or trace. Leave it off for a title-only
                prompt.
              </p>
            )}
          </SlideContentSection.Body>
        </SlideContentSection>
        <SlideContentSection>
          <SlideContentSection.Header>
            <span>Correct answer image</span>
            <span>Optional — players try to spot this among the drawings</span>
            <span className={styles.imageActions}>
              <Btn variant="secondary" size="sm" onClick={pickCorrectImage}>
                {hasCorrectImage ? "Replace image" : "Choose image"}
              </Btn>
              <Btn variant="secondary" size="sm" onClick={drawCorrectImage}>
                Draw one
              </Btn>
              {hasCorrectImage && !answerImageLocked && (
                <Btn variant="error" fill="ghost" size="sm" onClick={editor.clearCorrectImage}>
                  Remove
                </Btn>
              )}
            </span>
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            {hasCorrectImage ? (
              <div className={styles.imageSection}>
                <img
                  className={styles.imagePreview}
                  src={correctImageUrl}
                  alt={question.correctImage?.altText ?? "Correct answer image"}
                />
              </div>
            ) : (
              <p className={styles.imageHint}>
                Optional — add one to unlock the &quot;Spot the answer&quot; follow-up, where the
                room hunts for it among the players&apos; drawings. Pick something that could pass
                for a player&apos;s drawing: a photo among sketches gives itself away.
              </p>
            )}
            {answerImageLocked && (
              <p className={styles.lockedHint}>
                Can&apos;t remove your answer image — the attached &quot;Spot the answer&quot;
                follow-up needs it to grade. Replace it instead.
              </p>
            )}
          </SlideContentSection.Body>
        </SlideContentSection>
        <SlideContentSection>
          <SlideContentSection.Header>
            {" "}
            <span>Canvas Tools</span>{" "}
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            <div>
              {TOOL_TOGGLES.map(({ tool, label }) => (
                <Toggle
                  key={tool}
                  id={`draw-tool-${tool}-${question.id}`}
                  label={label}
                  labelPosition="labelBefore"
                  checked={question.tools.includes(tool)}
                  onChange={(e) => {
                    editor.setToolEnabled(tool, e.target.checked);
                  }}
                />
              ))}
            </div>
            <div>
              <div className={`${styles.paletteTool} ${hasPaletteTool && styles.visible}`}>
                <p>Palette </p>
                <PaletteEditor
                  palette={palette}
                  canAdd={editor.canAddPaletteColor}
                  onCommit={(next) => {
                    setPalette(next);
                    editor.commitPalette(next);
                  }}
                />
              </div>
            </div>
          </SlideContentSection.Body>
        </SlideContentSection>
      </SlideContent>
    </SlideWrapper>
  );
};

export { DrawingSlideContent };
