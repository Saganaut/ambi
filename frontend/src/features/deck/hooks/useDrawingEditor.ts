// Drawing-specific editing layer for the deck editor's Drawing slide.
//
// Sits on the generic `useSlideEditor<"DRAWING">` and exposes the
// intent-level surface the Drawing author UI consumes: a synthesized
// `question` view, the prompt edit, prompt-image management (gallery pick,
// author-drawn upload, clear, placement), the palette, and tool toggles.
// There is exactly ONE `useSlideEditor` instance per Drawing slide (this
// hook is instantiated once, in `DrawingSlideContent`), so every write
// funnels through a single draft + debounce buffer.
//
// A DRAWING slide is survey-style: players freehand-draw on a fixed 1:1
// canvas (the logical size is a client constant — see DrawingCanvas) and
// submit a rendered PNG; the round itself never grades. The one authored
// answer this kind carries is `correctImage` — the author's own picture of
// the right answer, which a SPOT_THE_ANSWER follow-up seeds onto its board
// among the players' drawings. It changes nothing about the Drawing round,
// so there is still no scoring here; it only unlocks that follow-up mode
// (see `utils/followUp.hasScorableAnswerKey`).
//
// Both image slots share one ingest path: an author's drawn image goes
// through the same gallery upload as a picked file — `saveDrawnPrompt` /
// `saveDrawnCorrectImage` turn the canvas blob into a stored AppImage and
// slot it as `imagePrompt` / `correctImage` respectively.
import {
  useGetMyGalleryQuery,
  useUploadImageMutation,
} from "@features/gallery/store/galleryApi.gen";
import type { AppImage } from "@deck/store/deckApi.gen";
import type { PromptPlacement, Tool } from "@deck/store/deckEnums.gen";

import { useSlideEditor } from "./useSlideEditor";

/** Cap the palette where swatch rows stop reading as a quick pick. */
const MAX_DRAWING_PALETTE = 12;

/** Flattened, UI-facing view of the active Drawing slide. */
interface DrawingQuestionView {
  id: string;
  /** The prompt text — stored in `slide.title`, not in the content. */
  prompt: string;
  /** Optional image players see with the canvas (unset = title-only prompt). */
  imagePrompt?: AppImage;
  /** Beside the canvas as a reference, or under the strokes as a trace layer. */
  promptPlacement: PromptPlacement;
  /** The author's own answer picture — seeded onto a Spot-the-answer follow-up
   *  board, never shown to players on this round (unset = no such answer). */
  correctImage?: AppImage;
  /** Author-configured stroke colors offered to players. */
  palette: string[];
  /** Enabled drawing tools (PEN is always present). */
  tools: Tool[];
}

interface UseDrawingEditorResult {
  /** The active slide as a flat view, or undefined until one is selected. */
  question: DrawingQuestionView | undefined;

  /** Debounced prompt edit → persisted to `slide.title`. */
  schedulePrompt: (html: string) => void;
  /** Flush any pending debounced edit immediately (bind to blur). */
  flush: () => void;

  /** ── Prompt image ────────────────────────────────────────────────────── */
  /** Set the prompt image (gallery pick / upload). Immediate. */
  setImagePrompt: (image: AppImage) => void;
  /** Drop the prompt image entirely (back to a title-only prompt). Immediate. */
  clearImagePrompt: () => void;
  /** Ingest an author-drawn canvas PNG into the gallery, then set it as the
   *  prompt image. Rejects when the personal gallery isn't loaded yet. */
  saveDrawnPrompt: (blob: Blob) => Promise<void>;
  /** Where players see the prompt image. Immediate. */
  setPromptPlacement: (placement: PromptPlacement) => void;

  /** ── Correct-answer image ────────────────────────────────────────────── */
  /** Set the correct-answer image (gallery pick / upload). Immediate. */
  setCorrectImage: (image: AppImage) => void;
  /** Drop the correct-answer image. Immediate — callers must first check it
   *  wouldn't orphan an attached keyed follow-up (the PUT can't surface the
   *  backend's 400). */
  clearCorrectImage: () => void;
  /** Ingest an author-drawn canvas PNG into the gallery, then set it as the
   *  correct-answer image. Rejects when the personal gallery isn't loaded yet. */
  saveDrawnCorrectImage: (blob: Blob) => Promise<void>;

  /** ── Canvas configuration ────────────────────────────────────────────── */
  canAddPaletteColor: boolean;
  /** Palette edit (color pick / add / remove). Immediate. */
  commitPalette: (palette: string[]) => void;
  /** Enable/disable a tool. PEN can never be removed. Immediate. */
  setToolEnabled: (tool: Tool, enabled: boolean) => void;
}

const useDrawingEditor = (deckId: string, slideId: string): UseDrawingEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "DRAWING");
  const { data: myGallery } = useGetMyGalleryQuery();
  const [uploadImage] = useUploadImageMutation();

  const slide = editor.slide;
  const content = slide?.content;

  const question: DrawingQuestionView | undefined = slide
    ? {
        id: slide.id,
        prompt: slide.title,
        imagePrompt: content?.imagePrompt,
        promptPlacement: content?.promptPlacement ?? "ALONGSIDE",
        correctImage: content?.correctImage,
        palette: content?.palette ?? [],
        tools: content?.tools ?? ["PEN"],
      }
    : undefined;

  const schedulePrompt = (html: string) => {
    editor.updateMetadata({ title: html });
  };

  const setImagePrompt = (image: AppImage) => {
    editor.updateSlideContent({ imagePrompt: image });
    editor.flush();
  };

  const clearImagePrompt = () => {
    editor.updateSlideContent({ imagePrompt: undefined });
    editor.flush();
  };

  const saveDrawnPrompt = async (blob: Blob): Promise<void> => {
    if (!myGallery?.id) {
      throw new Error("Your gallery isn't ready yet — try again in a moment.");
    }
    const file = new File([blob], "drawn-prompt.png", { type: "image/png" });
    const created = await uploadImage({
      id: myGallery.id,
      name: "Drawn prompt",
      body: { file },
    }).unwrap();
    setImagePrompt(created.image);
  };

  const setPromptPlacement = (placement: PromptPlacement) => {
    editor.updateSlideContent({ promptPlacement: placement });
    editor.flush();
  };

  const setCorrectImage = (image: AppImage) => {
    editor.updateSlideContent({ correctImage: image });
    editor.flush();
  };

  const clearCorrectImage = () => {
    editor.updateSlideContent({ correctImage: undefined });
    editor.flush();
  };

  const saveDrawnCorrectImage = async (blob: Blob): Promise<void> => {
    if (!myGallery?.id) {
      throw new Error("Your gallery isn't ready yet — try again in a moment.");
    }
    const file = new File([blob], "drawn-correct-answer.png", { type: "image/png" });
    const created = await uploadImage({
      id: myGallery.id,
      name: "Drawn correct answer",
      body: { file },
    }).unwrap();
    setCorrectImage(created.image);
  };

  const canAddPaletteColor = (question?.palette.length ?? 0) < MAX_DRAWING_PALETTE;

  const commitPalette = (palette: string[]) => {
    editor.updateSlideContent({ palette: palette.slice(0, MAX_DRAWING_PALETTE) });
    editor.flush();
  };

  const setToolEnabled = (tool: Tool, enabled: boolean) => {
    editor.updateSlideContent((prev) => {
      const tools = new Set<Tool>(prev.tools);
      if (enabled) tools.add(tool);
      else tools.delete(tool);
      tools.add("PEN"); // The pen is the slide's reason to exist.
      return { tools: [...tools] };
    });
    editor.flush();
  };

  return {
    question,
    schedulePrompt,
    flush: editor.flush,
    setImagePrompt,
    clearImagePrompt,
    saveDrawnPrompt,
    setPromptPlacement,
    setCorrectImage,
    clearCorrectImage,
    saveDrawnCorrectImage,
    canAddPaletteColor,
    commitPalette,
    setToolEnabled,
  };
};

export { MAX_DRAWING_PALETTE, useDrawingEditor };
export type { DrawingQuestionView, UseDrawingEditorResult };
