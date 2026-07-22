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
 *   - "Canvas tools" card: which tools players get (pen is always on) and
 *     the stroke-color palette (shown while COLOR_PALETTE is enabled).
 *
 * `correctImage` exists on the wire for a future compare/vote feature and is
 * deliberately not surfaced here.
 */
import { useState } from "react";

import { DEFAULT_DRAWING_PALETTE } from "@deck/utils/slideContent";
import { useDrawingEditor } from "@deck/hooks/useDrawingEditor";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { useModal } from "@hooks/useModal";
import { RadioGroup } from "@components/Forms/Input/RadioGroup/RadioGroup";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { Btn } from "@ui/Buttons/Btn";
import type { PromptPlacement, Tool } from "@deck/store/deckEnums.gen";
import { isImageEmpty, largestUrl } from "@utils/image";
import { EmptySelect, SettingsCard, SettingsRow } from "../_shared";
import type { SlideContentProps } from "../slideContentProps";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { DrawPromptModalBody } from "./DrawPromptModalBody";
import { PaletteEditor } from "./PaletteEditor";
import styles from "./DrawingSlideContent.module.css";

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

  if (!question) return <EmptySelect title='Drawing' />;

  const imageUrl = isImageEmpty(question.imagePrompt)
    ? null
    : largestUrl(question.imagePrompt, question.id);
  const hasImage = imageUrl != null;
  const hasPaletteTool = question.tools.includes("COLOR_PALETTE");

  const pickImage = () => {
    editor.flush();
    // "source" keeps the upload's own aspect ratio; ALONGSIDE display shows it
    // as-is, and BACKGROUND cover-fits it onto the square canvas at draw time.
    openPicker(editor.setImagePrompt, { title: "Prompt image", cropAspect: "source" });
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

  return (
    <SlideContentWrapper
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
          Players draw on a square canvas and their pictures are collected — pair
          this slide with a best-answer-vote follow-up to score them.
        </p>
      }>
      <SettingsCard
        title='Prompt image'
        action={
          <span className={styles.imageActions}>
            <Btn variant='secondary' size='sm' onClick={pickImage}>
              {hasImage ? "Replace image" : "Choose image"}
            </Btn>
            <Btn variant='secondary' size='sm' onClick={drawImage}>
              Draw one
            </Btn>
            {hasImage && (
              <Btn variant='error' fill='ghost' size='sm' onClick={editor.clearImagePrompt}>
                Remove
              </Btn>
            )}
          </span>
        }>
        {hasImage ? (
          <img
            className={styles.imagePreview}
            src={imageUrl}
            alt={question.imagePrompt?.altText ?? "Prompt image"}
          />
        ) : (
          <p className={styles.imageHint}>
            Optional — give players an image to look at or trace. Leave it off for a
            title-only prompt.
          </p>
        )}
        <RadioGroup
          name={`draw-placement-${question.id}`}
          legend='Players see it'
          options={[
            { value: "ALONGSIDE", label: "Beside the canvas" },
            { value: "BACKGROUND", label: "On the canvas, traceable" },
          ]}
          value={question.promptPlacement}
          disabled={!hasImage}
          onChange={(value) => {
            editor.setPromptPlacement(value as PromptPlacement);
          }}
        />
      </SettingsCard>

      <SettingsCard title='Canvas tools'>
        <SettingsRow>
          {TOOL_TOGGLES.map(({ tool, label }) => (
            <Toggle
              key={tool}
              id={`draw-tool-${tool}-${question.id}`}
              label={label}
              checked={question.tools.includes(tool)}
              onChange={(e) => {
                editor.setToolEnabled(tool, e.target.checked);
              }}
            />
          ))}
        </SettingsRow>
        {hasPaletteTool && (
          <PaletteEditor
            palette={palette}
            canAdd={editor.canAddPaletteColor}
            onCommit={(next) => {
              setPalette(next);
              editor.commitPalette(next);
            }}
          />
        )}
      </SettingsCard>
    </SlideContentWrapper>
  );
};

export { DrawingSlideContent };
