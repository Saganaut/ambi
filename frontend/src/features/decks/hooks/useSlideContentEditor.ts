import { useRef } from "react";
import type { SlideContent, SlideRequest, SlideResponse } from "@store/AmbiApi";
import { useDebouncedCommit } from "@/shared/hooks/useDebouncedCommit";
import { useSlide, type SlideType } from "./useSlide";

/**
 * Editing layer for a single slide's content. Sits on top of {@link useSlide}
 * (which owns the slide collection + the full-slide PUT) and exposes
 * intent-level, type-safe edit handlers for the active slide.
 *
 * <p>The hook is generic over the slide's {@link SlideType}, so each per-kind
 * inspector section instantiates it monomorphically
 * (<code>useSlideContentEditor&lt;"MCQ"&gt;(deckId, slideId)</code>) and gets
 * <code>content</code> patches narrowed to that kind — no runtime
 * <code>contentType</code> switch lives here. The dispatcher in
 * <code>EditSlidePanel</code> is what routes a slide to the right section.
 *
 * <p>Commits are debounced (see {@link useDebouncedCommit}): rapid edits across
 * several fields accumulate into one slide patch and land as a single PUT once
 * editing goes quiet, or immediately on {@link UseSlideContentEditorResult#flush}
 * (bind to <code>onBlur</code> / before a structural change).
 *
 * <p>Image edits (<code>backgroundImage</code> / <code>coverImage</code>) are
 * intentionally absent — they go through a separate, dedicated API call rather
 * than the slide PUT.
 *
 * @param deckId  deck whose slide cache to read/write
 * @param slideId id of the slide being edited
 */
interface UseSlideContentEditorResult<T extends SlideType> {
  /** The live slide from the cache, narrowed to type `T` (undefined until loaded). */
  slide: Extract<SlideResponse, { slideType: T }> | undefined;
  /** Patch slide-level metadata (debounced). */
  updateMetadata: (
    updates: Partial<Pick<SlideRequest, "title" | "section" | "speakerNotes">>,
  ) => void;
  /**
   * Shallow-merge a patch onto the slide's content (debounced). `contentType`
   * is preserved from the current content, so the discriminant can't drift.
   * Nested collections (options, items, correctValues, …) must be passed whole.
   *
   * <p>Pass a function to derive the patch from the freshest pending content
   * (the accumulated draft if one exists, else the live cache). Use this form
   * for collection edits — appending an option, toggling a correct id — so
   * back-to-back writes inside one debounce window build on each other instead
   * of each starting from the same stale render snapshot.
   */
  updateSlideContent: (
    patch:
      | Partial<Extract<SlideContent, { contentType: T }>>
      | ((
          prev: Extract<SlideContent, { contentType: T }>,
        ) => Partial<Extract<SlideContent, { contentType: T }>>),
  ) => void;
  /** Flush any pending debounced edit immediately. */
  flush: () => void;
}

const useSlideContentEditor = <T extends SlideType>(
  deckId: string,
  slideId: string,
): UseSlideContentEditorResult<T> => {
  const { getSlide, updateSlide } = useSlide(deckId);
  const slide = getSlide(slideId) as
    | Extract<SlideResponse, { slideType: T }>
    | undefined;

  // Accumulated, not-yet-committed slide patch. Lets rapid edits to different
  // fields coalesce into one PUT instead of each merge starting from a stale
  // cache read. Reset on commit and whenever the active slide changes.
  const draftRef = useRef<Partial<SlideRequest> | null>(null);
  const syncedIdRef = useRef<string | null>(null);

  const { schedule, flush } = useDebouncedCommit<Partial<SlideRequest>>(
    (patch) => {
      updateSlide(slideId, patch);
      draftRef.current = null;
    },
  );

  // Drop any pending draft when the editor switches slides so edits never bleed
  // from one slide into the next.
  if (syncedIdRef.current !== slideId) {
    syncedIdRef.current = slideId;
    draftRef.current = null;
  }

  const mergePatch = (patch: Partial<SlideRequest>) => {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    schedule(next);
  };

  const updateMetadata = (
    updates: Partial<Pick<SlideRequest, "title" | "section" | "speakerNotes">>,
  ) => mergePatch(updates);

  const updateSlideContent = (
    patch:
      | Partial<Extract<SlideContent, { contentType: T }>>
      | ((
          prev: Extract<SlideContent, { contentType: T }>,
        ) => Partial<Extract<SlideContent, { contentType: T }>>),
  ) => {
    if (!slide) return;
    // Merge onto the freshest content: a pending draft if one exists, else the
    // live cache value. The cast contains the union-widening the spread of a
    // discriminated `SlideContent` would otherwise produce.
    const base = (draftRef.current?.content ?? slide.content) as Extract<
      SlideContent,
      { contentType: T }
    >;
    // A function patch derives from `base` so collection edits chained inside
    // one debounce window compound instead of overwriting each other.
    const resolved = typeof patch === "function" ? patch(base) : patch;
    mergePatch({ content: { ...base, ...resolved } as SlideContent });
  };

  return { slide, updateMetadata, updateSlideContent, flush };
};

export { useSlideContentEditor };
export type { UseSlideContentEditorResult };
