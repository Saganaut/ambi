// Slide-collection layer between the generated slide API and the deck editor.
// Reads the `listSlides` cache for a single deck and exposes intent-level
// add / update / remove / reorder handlers, so the editor never imports RTK
// Query directly. The handlers are thin: they just fire the mutation. Cache
// behaviour (optimistic patch + tag-driven reconciling refetch) lives in
// `store/enhancements/slide.ts` so it applies no matter who calls the mutation.
import {
  useListSlidesQuery,
  useAddSlideMutation,
  useUpdateSlideMutation,
  useRemoveSlideMutation,
  useMoveSlideMutation,
  type SlideRequest,
  type SlideResponse,
} from "@/store/AmbiApi";

type SlideType = NonNullable<SlideRequest["slideType"]>;

/**
 * Minimal SlideRequest for a brand-new slide. Unlike the old element payloads,
 * every field on the slim slide API is optional, so we only stamp identity +
 * type and a blank title. Typed `content` (MCQ, …) is left off — a TITLE slide
 * has none, and the type-specific editor fills it in once the slide exists.
 *
 * @param slideType the slide kind to create
 * @param id client-minted id, reused for the optimistic patch and the persisted
 *   POST so the slide stays selected without a flicker
 */
const buildNewSlide = (slideType: SlideType, id: string): SlideRequest => ({
  id,
  slideType,
  title: "",
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
  /** Append a slide; returns the new client-minted id. */
  addSlide: (options?: AddSlideOptions) => string;
  /** Patch a slide (PUT replaces the whole slide). */
  updateSlide: (slideId: string, patch: Partial<SlideRequest>) => void;
  /** Remove a slide. */
  removeSlide: (slideId: string) => void;
  /**
   * Move a slide to a new zero-based position in the deck's order. The backend
   * computes the new LexoRank `sortOrder` key from the index; the reconciling
   * refetch lands the canonical order. Pairs with the rail's drag-and-drop.
   */
  reorder: (slideId: string, toIndex: number) => void;
}

const useSlide = (deckId: string): UseSlideResult => {
  const { data, isLoading, error } = useListSlidesQuery({ id: deckId });
  const slides = data ?? [];

  const [addSlideMutation] = useAddSlideMutation();
  const [updateSlideMutation] = useUpdateSlideMutation();
  const [removeSlideMutation] = useRemoveSlideMutation();
  const [moveSlideMutation] = useMoveSlideMutation();

  const getSlide = (slideId: string) =>
    slides.find((slide) => slide.id === slideId);

  const addSlide = (options: AddSlideOptions = {}) => {
    const id = crypto.randomUUID();
    const slideRequest: SlideRequest = {
      ...buildNewSlide(options.slideType ?? "TITLE", id),
      ...(options.title != null ? { title: options.title } : {}),
    };
    void addSlideMutation({ id: deckId, slideRequest });
    return id;
  };

  const updateSlide = (slideId: string, patch: Partial<SlideRequest>) => {
    const current = slides.find((slide) => slide.id === slideId);
    if (!current) return;
    // PUT replaces the whole slide, so carry the cached slide forward and
    // overlay the patch. The few response-only fields that ride along (audit
    // ids, version) are ignored server-side.
    const slideRequest: SlideRequest = { ...current, ...patch };
    void updateSlideMutation({ id: deckId, slideId, slideRequest });
  };

  const removeSlide = (slideId: string) => {
    void removeSlideMutation({ id: deckId, slideId });
  };

  const reorder = (slideId: string, toIndex: number) => {
    void moveSlideMutation({
      id: deckId,
      slideId,
      moveSlideRequest: { to: toIndex },
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
    reorder,
  };
};

export { useSlide };
export type { UseSlideResult, AddSlideOptions, SlideType };
