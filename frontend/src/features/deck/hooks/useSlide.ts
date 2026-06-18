// Slide-collection layer between the generated slide API and the deck editor.
// Reads the `listSlides` cache for a single deck and exposes intent-level
// add / update / remove / reorder handlers, so the editor never imports RTK
// Query directly. The handlers are thin: they just fire the mutation. Cache
// behaviour (optimistic patch + tag-driven reconciling refetch) lives in
// `store/enhancements/slide.ts` so it applies no matter who calls the mutation.
import {
  useListDeckSlidesQuery,
  useAddSlideMutation,
  useAddFollowUpSlideMutation,
  useUpdateSlideMutation,
  useRemoveSlideMutation,
  useMoveSlideMutation,
  useSetSlideCoverImageMutation,
  useClearSlideCoverImageMutation,
  useSetSlideBackgroundImageMutation,
  useClearSlideBackgroundImageMutation,
  useHideSlideBackgroundMutation,
  type AppImage,
  type Placement,
  type SlideRequest,
  type SlideResponse,
} from "@deck/store/deckApi.gen";
import { buildDefaultContent } from "../utils/slideContent";
import { FollowUpMode, SlideType } from "@deck/store/deckEnums.gen";

/** Which dedicated image slot on a slide a handler targets. */
type ImageRole = "cover" | "background";

/**
 * Minimal SlideRequest for a brand-new slide. We stamp identity, a blank title,
 * and type-specific placeholder `content` (required and discriminated by
 * `contentType`, the slide's only kind marker) via {@link buildDefaultContent}.
 * The type-specific editor fills the real content in once the slide exists.
 *
 * @param slideType the slide kind to create
 * @param id client-minted id, reused for the optimistic patch and the persisted
 *   POST so the slide stays selected without a flicker
 */
const buildNewSlide = (slideType: SlideType, id: string): SlideRequest => ({
  id,
  title: "",
  content: buildDefaultContent(slideType),
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
  /**
   * Attach a follow-up slide directly after a scorable parent; returns the new
   * client-minted id. The link and placement are server-owned — the dedicated
   * endpoint is the only way a follow-up comes to exist.
   */
  addFollowUp: (parentSlideId: string, mode: FollowUpMode) => string;
  /** Patch a slide (PUT replaces the whole slide). */
  updateSlide: (slideId: string, patch: Partial<SlideRequest>) => void;
  /** Remove a slide. */
  removeSlide: (slideId: string) => void;
  /**
   * Set a slide's cover or background image. These have a dedicated endpoint
   * (not folded into {@link updateSlide}), so changing an image never
   * round-trips the whole slide's content. `placement` positions the image on
   * the slide grid (see {@link Placement}) and is honoured only for the cover
   * slot; it is ignored for the background.
   */
  setSlideImage: (slideId: string, slot: ImageRole, image: AppImage, placement?: Placement) => void;
  /**
   * Clear a slide's cover or background image. For a background this is the
   * "reset to deck" action — it drops the slide's own image and lets it inherit
   * the deck default again. To instead remove the background entirely (ignoring
   * the deck default), use {@link hideSlideBackground}.
   */
  clearSlideImage: (slideId: string, slot: ImageRole) => void;
  /**
   * Remove a slide's background entirely: no own image and the deck default
   * suppressed, so the slide renders with no background even when the deck has
   * one. The third background state, distinct from {@link clearSlideImage}
   * ("reset to deck"). Background-only — covers have no such state.
   */
  hideSlideBackground: (slideId: string) => void;
  /**
   * Move a slide to a new zero-based position in the deck's order. The backend
   * computes the new LexoRank `sortOrder` key from the index; the reconciling
   * refetch lands the canonical order. Pairs with the rail's drag-and-drop.
   */
  reorder: (slideId: string, toIndex: number) => void;
}

const useSlide = (deckId: string): UseSlideResult => {
  const { data, isLoading, error } = useListDeckSlidesQuery({ id: deckId });
  const slides = data ?? [];

  const [addSlideMutation] = useAddSlideMutation();
  const [addFollowUpSlideMutation] = useAddFollowUpSlideMutation();
  const [updateSlideMutation] = useUpdateSlideMutation();
  const [removeSlideMutation] = useRemoveSlideMutation();
  const [moveSlideMutation] = useMoveSlideMutation();
  const [setCoverImageMutation] = useSetSlideCoverImageMutation();
  const [clearCoverImageMutation] = useClearSlideCoverImageMutation();
  const [setBackgroundImageMutation] = useSetSlideBackgroundImageMutation();
  const [clearBackgroundImageMutation] = useClearSlideBackgroundImageMutation();
  const [hideBackgroundMutation] = useHideSlideBackgroundMutation();

  const getSlide = (slideId: string) => slides.find((slide) => slide.id === slideId);

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
    // ids, version, the server-owned parentId/childId link) are ignored
    // server-side.
    const slideRequest: SlideRequest = { ...current, ...patch };
    void updateSlideMutation({ id: deckId, slideId, slideRequest });
  };

  const addFollowUp = (parentSlideId: string, mode: FollowUpMode) => {
    const id = crypto.randomUUID();
    void addFollowUpSlideMutation({
      id: deckId,
      slideId: parentSlideId,
      addFollowUpRequest: { id, mode, title: "" },
    });
    return id;
  };

  const removeSlide = (slideId: string) => {
    void removeSlideMutation({ id: deckId, slideId });
  };

  const setSlideImage = (
    slideId: string,
    slot: ImageRole,
    image: AppImage,
    placement?: Placement,
  ) => {
    const mutate = slot === "cover" ? setCoverImageMutation : setBackgroundImageMutation;
    // Placement is a cover-only concern for now; the background ignores it.
    const payload = slot === "cover" && placement !== undefined ? { ...image, placement } : image;
    console.log("Payload", payload);
    void mutate({ id: deckId, slideId, setImageRequest: { image: payload } });
  };

  const clearSlideImage = (slideId: string, slot: ImageRole) => {
    const mutate = slot === "cover" ? clearCoverImageMutation : clearBackgroundImageMutation;
    void mutate({ id: deckId, slideId });
  };

  const hideSlideBackground = (slideId: string) => {
    void hideBackgroundMutation({ id: deckId, slideId });
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
    addFollowUp,
    updateSlide,
    removeSlide,
    setSlideImage,
    clearSlideImage,
    hideSlideBackground,
    reorder,
  };
};

export { useSlide };
export type { UseSlideResult, AddSlideOptions, ImageRole };
