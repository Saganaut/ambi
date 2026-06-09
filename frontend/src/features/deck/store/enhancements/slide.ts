/**
 * Optimistic + reconcile rules for the slim slide API (the deck editor's left
 * rail). `listDeckSlides` is the single source of truth for a deck's slide
 * collection; the editor renders purely by its array order.
 *
 * Every slide mutation reconciles that cache *from its own HTTP response* rather
 * than invalidating a tag and refetching the whole list. Each handler optimistically
 * patches `listDeckSlides` so the rail reflects the edit before the round trip,
 * then — once the mutation resolves — folds the authoritative response back into
 * the cache (the server owns audit ids, version, and the LexoRank `sortOrder`
 * key). On reject the optimistic patch is undone. No mutation triggers a
 * `GET …/slides` refetch.
 *
 * The shared {@link reconcilingSlideMutation} factory encapsulates that
 * optimistic→await→reconcile→undo flow so each endpoint stays a couple of
 * declarative lines.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import { CacheSyncMutationApi } from "@/shared/store/enhancements/types";
import {
  deckApi,
  type AddSlideApiArg,
  type AnswerSettingsResponse,
  type ClearSlideAnswerSettingsApiArg,
  type ClearSlideBackgroundImageApiArg,
  type ClearSlideCoverImageApiArg,
  type ClearSlidePointSettingsApiArg,
  type MoveSlideApiArg,
  type PointSettingsResponse,
  type RemoveSlideApiArg,
  type SetSlideAnswerSettingsApiArg,
  type SetSlideBackgroundImageApiArg,
  type SetSlideCoverImageApiArg,
  type SetSlidePointSettingsApiArg,
  type SlideRequest,
  type SlideResponse,
  type UpdateSlideApiArg,
} from "../deckApi.gen";

/**
 * Build a slide-mutation endpoint config that reconciles `listDeckSlides` from
 * the mutation's response instead of invalidating + refetching.
 *
 * @param optimistic mutate the cached `SlideResponse[]` before the round trip
 * @param reconcile  (optional) fold the authoritative response `data` into the
 *   cache once the mutation resolves; omit when the response carries nothing to
 *   reconcile (e.g. a 204).
 *
 * The callbacks' `draft` is typed `SlideResponse[]` from the
 * `updateQueryData("listDeckSlides", …)` call site, so no generics-wrangling is
 * needed for it.
 */
const reconcilingSlideMutation = <Arg extends { id: string }, Data>(
  optimistic: (draft: SlideResponse[], arg: Arg) => void,
  reconcile?: (draft: SlideResponse[], data: Data, arg: Arg) => void,
) => ({
  onQueryStarted: async (
    arg: Arg,
    { dispatch, queryFulfilled }: CacheSyncMutationApi<Data>,
  ) => {
    const patch = dispatch(
      deckApi.util.updateQueryData(
        "listDeckSlides",
        { id: arg.id },
        (draft) => {
          optimistic(draft, arg);
        },
      ),
    );
    try {
      const { data } = await queryFulfilled;
      if (reconcile) {
        dispatch(
          deckApi.util.updateQueryData(
            "listDeckSlides",
            { id: arg.id },
            (draft) => {
              reconcile(draft, data, arg);
            },
          ),
        );
      }
    } catch {
      patch.undo();
    }
  },
});

/** Replace the slide with a matching id, else append. */
const upsertSlideById = (draft: SlideResponse[], slide: SlideResponse) => {
  const idx = draft.findIndex((s) => s.id === slide.id);
  if (idx === -1) draft.push(slide);
  else draft[idx] = slide;
};

/** Run `fn` against the slide with `slideId`, if it's in the list. */
const withSlide = (
  draft: SlideResponse[],
  slideId: string,
  fn: (slide: SlideResponse) => void,
) => {
  const slide = draft.find((s) => s.id === slideId);
  if (slide) fn(slide);
};

/**
 * Project a SlideRequest into a SlideResponse for optimistic insertion. The
 * server stamps audit fields + the LexoRank `sortOrder` on confirm; until the
 * reconcile lands we fill the required ones with empty placeholders that the
 * reconcile overwrites. The slide id is client-minted (required on the request),
 * so the optimistic row and the server's response match by id.
 */
const optimisticSlide = (request: SlideRequest): SlideResponse => ({
  ...request,
  id: request.id,
  createdByUserId: "",
  lastEditedByUserId: "",
});

deckApi.enhanceEndpoints({
  endpoints: {
    addSlide: reconcilingSlideMutation<AddSlideApiArg, SlideResponse>(
      (draft, arg) => {
        draft.push(optimisticSlide(arg.slideRequest));
      },
      (draft, data) => {
        upsertSlideById(draft, data);
      },
    ),
    updateSlide: reconcilingSlideMutation<UpdateSlideApiArg, SlideResponse>(
      (draft, arg) => {
        // PUT replaces the whole slide; overlay the request onto the cached row.
        withSlide(draft, arg.slideId, (slide) =>
          Object.assign(slide, arg.slideRequest),
        );
      },
      (draft, data) => {
        upsertSlideById(draft, data);
      },
    ),
    // 204 — the optimistic splice is the final state. Server-side neighbor
    // parent/child back-pointer rewrites are invisible to the rail, so there's
    // nothing to reconcile.
    removeSlide: reconcilingSlideMutation<RemoveSlideApiArg, unknown>(
      (draft, arg) => {
        const idx = draft.findIndex((slide) => slide.id === arg.slideId);
        if (idx !== -1) draft.splice(idx, 1);
      },
    ),
    // Cover/background images have a dedicated home (separate from updateSlide)
    // so a content edit never clobbers them, and the future upload pipeline has
    // a route to grow into. The response is the reconciled slide (the backend may
    // rewrite srcKey / variants once real uploads land).
    setSlideCoverImage: reconcilingSlideMutation<
      SetSlideCoverImageApiArg,
      SlideResponse
    >(
      (draft, arg) => {
        withSlide(draft, arg.slideId, (slide) => {
          slide.coverImage = arg.setImageRequest.image;
        });
      },
      (draft, data) => {
        upsertSlideById(draft, data);
      },
    ),
    clearSlideCoverImage: reconcilingSlideMutation<
      ClearSlideCoverImageApiArg,
      SlideResponse
    >(
      (draft, arg) => {
        withSlide(draft, arg.slideId, (slide) => {
          slide.coverImage = undefined;
        });
      },
      (draft, data) => {
        upsertSlideById(draft, data);
      },
    ),
    setSlideBackgroundImage: reconcilingSlideMutation<
      SetSlideBackgroundImageApiArg,
      SlideResponse
    >(
      (draft, arg) => {
        withSlide(draft, arg.slideId, (slide) => {
          slide.backgroundImage = arg.setImageRequest.image;
        });
      },
      (draft, data) => {
        upsertSlideById(draft, data);
      },
    ),
    clearSlideBackgroundImage: reconcilingSlideMutation<
      ClearSlideBackgroundImageApiArg,
      SlideResponse
    >(
      (draft, arg) => {
        withSlide(draft, arg.slideId, (slide) => {
          slide.backgroundImage = undefined;
        });
      },
      (draft, data) => {
        upsertSlideById(draft, data);
      },
    ),
    // Point/answer settings live on `slide.settings` but, like the image slots,
    // have their own dedicated endpoints (separate from updateSlide) so a content
    // edit never clobbers them. The response carries `{ slideId, <settings> }`;
    // the same reconcile serves set and clear (clear's field is just undefined).
    setSlidePointSettings: reconcilingSlideMutation<
      SetSlidePointSettingsApiArg,
      PointSettingsResponse
    >(
      (draft, arg) => {
        withSlide(draft, arg.slideId, (slide) => {
          slide.settings = {
            ...slide.settings,
            pointSettings: arg.setPointSettingsRequest.pointSettings,
          };
        });
      },
      (draft, data) => {
        withSlide(draft, data.slideId, (slide) => {
          slide.settings = {
            ...slide.settings,
            pointSettings: data.pointSettings,
          };
        });
      },
    ),
    clearSlidePointSettings: reconcilingSlideMutation<
      ClearSlidePointSettingsApiArg,
      PointSettingsResponse
    >(
      (draft, arg) => {
        withSlide(draft, arg.slideId, (slide) => {
          if (slide.settings) slide.settings.pointSettings = undefined;
        });
      },
      (draft, data) => {
        withSlide(draft, data.slideId, (slide) => {
          slide.settings = {
            ...slide.settings,
            pointSettings: data.pointSettings,
          };
        });
      },
    ),
    setSlideAnswerSettings: reconcilingSlideMutation<
      SetSlideAnswerSettingsApiArg,
      AnswerSettingsResponse
    >(
      (draft, arg) => {
        withSlide(draft, arg.slideId, (slide) => {
          slide.settings = {
            ...slide.settings,
            answerSettings: arg.setAnswerSettingsRequest.answerSettings,
          };
        });
      },
      (draft, data) => {
        withSlide(draft, data.slideId, (slide) => {
          slide.settings = {
            ...slide.settings,
            answerSettings: data.answerSettings,
          };
        });
      },
    ),
    clearSlideAnswerSettings: reconcilingSlideMutation<
      ClearSlideAnswerSettingsApiArg,
      AnswerSettingsResponse
    >(
      (draft, arg) => {
        withSlide(draft, arg.slideId, (slide) => {
          if (slide.settings) slide.settings.answerSettings = undefined;
        });
      },
      (draft, data) => {
        withSlide(draft, data.slideId, (slide) => {
          slide.settings = {
            ...slide.settings,
            answerSettings: data.answerSettings,
          };
        });
      },
    ),
    // moveSlide returns the deck's slides in their new canonical order (with the
    // server-owned LexoRank keys), so the reconcile replaces the whole list. The
    // optimistic patch reorders the rail instantly; the response lands the
    // authoritative order.
    moveSlide: reconcilingSlideMutation<MoveSlideApiArg, SlideResponse[]>(
      (draft, arg) => {
        const from = draft.findIndex((slide) => slide.id === arg.slideId);
        if (from === -1) return;
        const to = Math.max(
          0,
          Math.min(arg.moveSlideRequest.to, draft.length - 1),
        );
        const [moved] = draft.splice(from, 1);
        draft.splice(to, 0, moved);
      },
      (draft, data) => {
        draft.splice(0, draft.length, ...data);
      },
    ),
  },
});
