import { useRef } from "react";
import type { SlideContent, SlideRequest, SlideResponse } from "@deck/store/deckApi.gen";
import { useDebouncedCommit } from "@/shared/hooks/useDebouncedCommit";
import { useSlide } from "./useSlide";
import { SlideType } from "@deck/store/deckEnums.gen";

/**
 * Editing layer for a single slide's content. Sits on top of {@link useSlide}
 * (which owns the slide collection + the full-slide PUT) and exposes
 * intent-level, type-safe edit handlers for the active slide.
 *
 * <p>The hook is generic over the slide's {@link SlideType}, so each per-kind
 * inspector section instantiates it monomorphically
 * (<code>useSlideEditor&lt;"MCQ"&gt;(deckId, slideId)</code>) and gets
 * <code>content</code> patches narrowed to that kind — no runtime
 * <code>contentType</code> switch lives here. The dispatcher in
 * <code>EditSlidePanel</code> is what routes a slide to the right section.
 *
 * <p>Commits are debounced (see {@link useDebouncedCommit}): rapid edits across
 * several fields accumulate into one slide patch and land as a single PUT once
 * editing goes quiet, or immediately on {@link UseSlideEditorResult#flush}
 * (bind to <code>onBlur</code> / before a structural change).
 *
 * <p>Image edits (<code>backgroundImage</code> / <code>coverImage</code>) are
 * intentionally absent — they go through a separate, dedicated API call rather
 * than the slide PUT.
 *
 * <p>Pass <code>contentType</code> to narrow the active slide to that kind via a
 * runtime guard ({@link isSlideOfType}); a slide of any other kind reads back as
 * <code>undefined</code>. Omit it for the type-agnostic surface (metadata only),
 * where <code>content</code> stays the full {@link SlideContent} union.
 *
 * @param deckId      deck whose slide cache to read/write
 * @param slideId     id of the slide being edited
 * @param contentType slide kind to narrow to; omit for the metadata-only surface
 */
/** The `content` arm for a kind-`T` slide. */
type ContentOf<T extends SlideType> = Extract<SlideContent, { contentType: T }>;

/**
 * A {@link SlideResponse} whose `content` is narrowed to the arm of type `T`.
 * The slide carries its kind solely on `content.contentType` (there is no
 * top-level type field), so narrowing happens on the content union.
 *
 * <p><code>SlideOfType&lt;SlideType&gt;</code> — the default when no concrete
 * kind is requested — collapses back to {@link SlideResponse}: an
 * <code>Extract</code> over the whole <code>SlideType</code> union keeps every
 * arm, so the type-agnostic path loses nothing.
 */
type SlideOfType<T extends SlideType> = Omit<SlideResponse, "content"> & {
  content: ContentOf<T>;
};

/**
 * A pending slide patch. Its `content`, when present, is always narrowed to the
 * editor's kind `T` — the draft never holds a content arm of another kind, so
 * reading it back needs no cast.
 */
type SlidePatch<T extends SlideType> = Omit<Partial<SlideRequest>, "content"> & {
  content?: ContentOf<T>;
};

/**
 * Sound narrowing guard. A slide's kind lives entirely on
 * <code>content.contentType</code>, so comparing it against the requested kind
 * narrows the whole slide to {@link SlideOfType}. Encapsulating the narrowing in
 * a guard is what lets the hook drop the old unchecked <code>as</code> cast: the
 * predicate is backed by a real runtime comparison, so a mismatched slide yields
 * <code>undefined</code> instead of a lie.
 */
const isSlideOfType = <T extends SlideType>(
  slide: SlideResponse,
  contentType: T,
): slide is SlideOfType<T> => slide.content.contentType === contentType;

interface UseSlideEditorResult<T extends SlideType> {
  /** The live slide from the cache, narrowed to type `T` (undefined until loaded). */
  slide: SlideOfType<T> | undefined;
  /** Patch slide-level metadata (debounced). */
  updateMetadata: (
    updates: Partial<
      Pick<SlideRequest, "title" | "section" | "speakerNotes" | "participantInstructions">
    >,
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
    patch: Partial<ContentOf<T>> | ((prev: ContentOf<T>) => Partial<ContentOf<T>>),
  ) => void;
  /** Flush any pending debounced edit immediately. */
  flush: () => void;
}

function useSlideEditor(deckId: string, slideId: string): UseSlideEditorResult<SlideType>;

function useSlideEditor<T extends SlideType>(
  deckId: string,
  slideId: string,
  contentType: T,
): UseSlideEditorResult<T>;

function useSlideEditor<T extends SlideType>(
  deckId: string,
  slideId: string,
  contentType?: T,
): UseSlideEditorResult<T> {
  const { getSlide, updateSlide } = useSlide(deckId);
  const raw = getSlide(slideId);
  // Narrow the cached slide to the requested kind via a runtime guard. Without a
  // `contentType` the consumer is type-agnostic (metadata only), so the slide
  // passes through with its full `SlideContent`; with one, a slide of any other
  // kind reads back as `undefined` rather than being asserted into a lie.
  const slide: SlideOfType<T> | undefined =
    raw == null
      ? undefined
      : contentType == null
        ? (raw as SlideOfType<T>)
        : isSlideOfType(raw, contentType)
          ? raw
          : undefined;

  // Accumulated, not-yet-committed slide patch. Lets rapid edits to different
  // fields coalesce into one PUT instead of each merge starting from a stale
  // cache read. Reset on commit and whenever the active slide changes.
  const draftRef = useRef<SlidePatch<T> | null>(null);
  const syncedIdRef = useRef<string | null>(null);

  const { schedule, flush } = useDebouncedCommit<Partial<SlideRequest>>((patch) => {
    updateSlide(slideId, patch);
    draftRef.current = null;
  });

  // Drop any pending draft when the editor switches slides so edits never bleed
  // from one slide into the next.
  if (syncedIdRef.current !== slideId) {
    syncedIdRef.current = slideId;
    draftRef.current = null;
  }

  const mergePatch = (patch: SlidePatch<T>) => {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    schedule(next);
  };

  const updateMetadata = (
    updates: Partial<
      Pick<SlideRequest, "title" | "section" | "speakerNotes" | "participantInstructions">
    >,
  ) => mergePatch(updates);

  const updateSlideContent = (
    patch: Partial<ContentOf<T>> | ((prev: ContentOf<T>) => Partial<ContentOf<T>>),
  ) => {
    if (!slide) return;
    // Merge onto the freshest content: a pending draft if one exists, else the
    // live cache value. Both are already narrowed to kind `T` (the draft by
    // construction, the cache by the guard above), so no cast is needed.
    const base = draftRef.current?.content ?? slide.content;
    // A function patch derives from `base` so collection edits chained inside
    // one debounce window compound instead of overwriting each other. Spreading
    // `base` last-wins preserves `contentType`, so the discriminant can't drift.
    const resolved = typeof patch === "function" ? patch(base) : patch;
    mergePatch({ content: { ...base, ...resolved } });
  };

  return { slide, updateMetadata, updateSlideContent, flush };
}

export { useSlideEditor };
export type { UseSlideEditorResult };
