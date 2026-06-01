// Slide-collection layer between the generated slide API and the deck editor.
// Owns the `listSlides` cache for a single deck and exposes optimistic add /
// update / remove handlers, so the editor never imports RTK Query directly and
// the rail reflects edits before the round trip. Reordering is intentionally
// left out for now — the slim API has no moveSlide endpoint, and the
// sortOrder / parentId / childId contract isn't settled yet.
import {
  Ambi,
  useListSlidesQuery,
  useAddSlideMutation,
  useUpdateSlideMutation,
  useRemoveSlideMutation,
  type SlideRequest,
  type SlideResponse,
} from "@/store/AmbiApi";
import { useAppDispatch } from "@/store/hooks";

type SlideType = NonNullable<SlideRequest["slideType"]>;

/**
 * Minimal SlideRequest for a brand-new slide. Unlike the old element payloads,
 * every field on the slim slide API is optional, so we only stamp identity +
 * type and a blank title. Typed `content` (MCQ, …) is left off — a TITLE slide
 * has none, and the type-specific editor fills it in once the slide exists.
 *
 * Exported so {@link useDeck}'s createDeck can seed an identical first slide.
 *
 * @param slideType the slide kind to create
 * @param id client-minted id, reused for the optimistic seed and the persisted
 *   POST so the slide stays selected without a flicker
 */
const buildNewSlide = (slideType: SlideType, id: string): SlideRequest => ({
  id,
  slideType,
  title: "",
});

/**
 * Project a SlideRequest into a SlideResponse for optimistic cache insertion.
 * The server stamps the audit fields on confirm; until then we fill the
 * required ones with empty placeholders that the real response overwrites.
 */
const optimisticSlide = (request: SlideRequest): SlideResponse => ({
  ...request,
  id: request.id ?? crypto.randomUUID(),
  createdByUserId: "",
  lastEditedByUserId: "",
});

interface AddSlideOptions {
  slideType?: SlideType;
  title?: string;
}

interface UseSlideResult {
  slides: SlideResponse[];
  isLoading: boolean;
  error: unknown;
  /** Look a slide up in the loaded collection by id. */
  getSlide: (slideId: string) => SlideResponse | undefined;
  /** Append a slide optimistically; returns the new client-minted id. */
  addSlide: (options?: AddSlideOptions) => string;
  /** Patch a slide optimistically (PUT replaces the whole slide). */
  updateSlide: (slideId: string, patch: Partial<SlideRequest>) => void;
  /** Remove a slide optimistically. */
  removeSlide: (slideId: string) => void;
}

const useSlide = (deckId: string): UseSlideResult => {
  const dispatch = useAppDispatch();
  const { data, isLoading, error } = useListSlidesQuery({ id: deckId });
  const slides = data ?? [];

  const [addSlideMutation] = useAddSlideMutation();
  const [updateSlideMutation] = useUpdateSlideMutation();
  const [removeSlideMutation] = useRemoveSlideMutation();

  const getSlide = (slideId: string) =>
    slides.find((slide) => slide.id === slideId);

  const addSlide = (options: AddSlideOptions = {}) => {
    const id = crypto.randomUUID();
    const request: SlideRequest = {
      ...buildNewSlide(options.slideType ?? "TITLE", id),
      ...(options.title != null ? { title: options.title } : {}),
    };

    // Append to the rail before the round trip; undo if the POST rejects.
    const patch = dispatch(
      Ambi.util.updateQueryData("listSlides", { id: deckId }, (draft) => {
        draft.push(optimisticSlide(request));
      }),
    ) as { undo: () => void };

    void addSlideMutation({ id: deckId, slideRequest: request })
      .unwrap()
      .then((created) => {
        // Swap the placeholder for the hydrated server slide (audit fields,
        // sortOrder, version, …).
        dispatch(
          Ambi.util.updateQueryData("listSlides", { id: deckId }, (draft) => {
            const idx = draft.findIndex((slide) => slide.id === id);
            if (idx !== -1) draft[idx] = created;
          }),
        );
      })
      .catch((err: unknown) => {
        patch.undo();
        console.error("Failed to add slide", err);
      });

    return id;
  };

  const updateSlide = (slideId: string, patch: Partial<SlideRequest>) => {
    const current = slides.find((slide) => slide.id === slideId);
    if (!current) return;

    // PUT replaces the whole slide, so carry the cached slide forward and
    // overlay the patch. The few response-only fields that ride along (audit
    // ids, version) are ignored server-side.
    const request: SlideRequest = { ...current, ...patch };

    const optimistic = dispatch(
      Ambi.util.updateQueryData("listSlides", { id: deckId }, (draft) => {
        const idx = draft.findIndex((slide) => slide.id === slideId);
        if (idx !== -1) draft[idx] = { ...draft[idx], ...patch };
      }),
    ) as { undo: () => void };

    void updateSlideMutation({ id: deckId, slideId, slideRequest: request })
      .unwrap()
      .then((updated) => {
        dispatch(
          Ambi.util.updateQueryData("listSlides", { id: deckId }, (draft) => {
            const idx = draft.findIndex((slide) => slide.id === slideId);
            if (idx !== -1) draft[idx] = updated;
          }),
        );
      })
      .catch((err: unknown) => {
        optimistic.undo();
        console.error("Failed to update slide", err);
      });
  };

  const removeSlide = (slideId: string) => {
    const optimistic = dispatch(
      Ambi.util.updateQueryData("listSlides", { id: deckId }, (draft) => {
        const idx = draft.findIndex((slide) => slide.id === slideId);
        if (idx !== -1) draft.splice(idx, 1);
      }),
    ) as { undo: () => void };

    void removeSlideMutation({ id: deckId, slideId })
      .unwrap()
      .catch((err: unknown) => {
        optimistic.undo();
        console.error("Failed to remove slide", err);
      });
  };

  return {
    slides,
    isLoading,
    error,
    getSlide,
    addSlide,
    updateSlide,
    removeSlide,
  };
};

export { useSlide, buildNewSlide, optimisticSlide };
export type { UseSlideResult, AddSlideOptions, SlideType };
