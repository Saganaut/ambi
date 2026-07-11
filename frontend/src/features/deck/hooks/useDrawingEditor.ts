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
// submit a rendered PNG; there is no static answer key, so nothing here
// touches scoring. The author's own drawn prompt goes through the same
// gallery ingest as an uploaded file — `saveDrawnPrompt` turns the canvas
// blob into a stored AppImage and slots it as `imagePrompt`.
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

  /** ── Canvas configuration ────────────────────────────────────────────── */
  canAddPaletteColor: boolean;
  /** Debounced palette edit (live color-picker drags). */
  schedulePalette: (palette: string[]) => void;
  /** Structural palette edit (add/remove/picker close). Immediate. */
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

  const canAddPaletteColor = (question?.palette.length ?? 0) < MAX_DRAWING_PALETTE;

  const schedulePalette = (palette: string[]) => {
    editor.updateSlideContent({ palette });
  };

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
    canAddPaletteColor,
    schedulePalette,
    commitPalette,
    setToolEnabled,
  };
};

export { MAX_DRAWING_PALETTE, useDrawingEditor };
export type { DrawingQuestionView, UseDrawingEditorResult };
