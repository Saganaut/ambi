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
 * declarative lines. Its sibling {@link reconcileOnlySlideMutation} serves the
 * one mutation that cannot be previewed at all — `duplicateSlide`, whose slide
 * ids the server mints.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import { CacheSyncMutationApi } from "@/shared/store/enhancements/Enhancements.types";
import { attachedFollowUpOf, groupIntoUnits } from "../../utils/followUp";
import {
  deckApi,
  type AddFollowUpSlideApiArg,
  type AddSlideApiArg,
  type AnswerSettingsResponse,
  type ClearSlideAnswerSettingsApiArg,
  type ClearSlideBackgroundColorApiArg,
  type ClearSlideBackgroundImageApiArg,
  type ClearSlideCoverImageApiArg,
  type ClearSlidePointSettingsApiArg,
  type DuplicateSlideApiArg,
  type HideSlideBackgroundApiArg,
  type MoveSlideApiArg,
  type PointSettingsResponse,
  type RemoveSlideApiArg,
  type SetSlideAnswerSettingsApiArg,
  type SetSlideBackgroundColorApiArg,
  type SetSlideBackgroundImageApiArg,
  type SetSlideCoverImageApiArg,
  type SetSlidePointSettingsApiArg,
  type SlideRequest,
  type SlideResponse,
  type UpdateSlideApiArg,
} from "../deckApi.gen";

/**
 * Write `mutate` into a deck's cached `listDeckSlides` array and hand back the
 * patch handle. Both factories below go through it, so the query name and its
 * cache key are spelled out once.
 */
const patchCachedSlides = (
  dispatch: CacheSyncMutationApi<unknown>["dispatch"],
  deckId: string,
  mutate: (draft: SlideResponse[]) => void,
) =>
  dispatch(
    deckApi.util.updateQueryData("listDeckSlides", { id: deckId }, mutate),
  );

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
    const patch = patchCachedSlides(dispatch, arg.id, (draft) => {
      optimistic(draft, arg);
    });
    try {
      const { data } = await queryFulfilled;
      if (reconcile) {
        patchCachedSlides(dispatch, arg.id, (draft) => {
          reconcile(draft, data, arg);
        });
      }
    } catch {
      patch.undo();
    }
  },
});

/**
 * The reconcile-only counterpart of {@link reconcilingSlideMutation}, for a
 * mutation whose outcome the client cannot preview because the server mints the
 * identity it returns. There is no optimistic patch, so there is nothing to undo
 * on reject either — the handler only awaits the response and folds it in.
 *
 * @param reconcile fold the authoritative response `data` into the cache
 */
const reconcileOnlySlideMutation = <Arg extends { id: string }, Data>(
  reconcile: (draft: SlideResponse[], data: Data, arg: Arg) => void,
) => ({
  onQueryStarted: async (
    arg: Arg,
    { dispatch, queryFulfilled }: CacheSyncMutationApi<Data>,
  ) => {
    try {
      const { data } = await queryFulfilled;
      patchCachedSlides(dispatch, arg.id, (draft) => {
        reconcile(draft, data, arg);
      });
    } catch {
      // Nothing was patched, so there is nothing to roll back. The catch exists
      // only so a failed request doesn't escape as an unhandled rejection —
      // RTK Query never awaits `onQueryStarted`. Callers still see the failure
      // through the mutation promise.
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
    // addFollowUpSlide returns the deck's slides in canonical order (it touches
    // two slides and inserts mid-list), so the reconcile replaces the whole
    // list, like moveSlide. The optimistic patch mirrors the server: link the
    // parent and slot the new follow-up directly after it.
    addFollowUpSlide: reconcilingSlideMutation<
      AddFollowUpSlideApiArg,
      SlideResponse[]
    >(
      (draft, arg) => {
        const parentIdx = draft.findIndex((slide) => slide.id === arg.slideId);
        if (parentIdx === -1) return;
        const request = arg.addFollowUpRequest;
        draft[parentIdx].childId = request.id;
        draft.splice(parentIdx + 1, 0, {
          id: request.id,
          title: request.title ?? "",
          content: { contentType: "FOLLOW_UP", mode: request.mode },
          parentId: arg.slideId,
          createdByUserId: "",
          lastEditedByUserId: "",
        });
      },
      (draft, data) => {
        draft.splice(0, draft.length, ...data);
      },
    ),
    // duplicateSlide copies the source — plus its attached follow-up, re-linked
    // to the copy — and inserts the copies straight after the source unit, so
    // like addFollowUpSlide it answers with the deck's slides in canonical order
    // and the reconcile replaces the whole list. It gets no optimistic patch:
    // the copies' ids are minted server-side, so there is no row the rail could
    // render (or keep selected) ahead of the response.
    duplicateSlide: reconcileOnlySlideMutation<
      DuplicateSlideApiArg,
      SlideResponse[]
    >((draft, data) => {
      draft.splice(0, draft.length, ...data);
    }),
    // 204 — the optimistic splice is the final state, so it mirrors the
    // server's cascade: deleting a parent takes its attached follow-up with it,
    // and deleting a follow-up frees the parent's child slot.
    removeSlide: reconcilingSlideMutation<RemoveSlideApiArg, unknown>(
      (draft, arg) => {
        const idx = draft.findIndex((slide) => slide.id === arg.slideId);
        if (idx === -1) return;
        const [removed] = draft.splice(idx, 1);
        const child = attachedFollowUpOf(removed, draft);
        if (child) {
          const childIdx = draft.findIndex((slide) => slide.id === child.id);
          if (childIdx !== -1) draft.splice(childIdx, 1);
        }
        if (removed.parentId) {
          withSlide(draft, removed.parentId, (parent) => {
            if (parent.childId === arg.slideId) parent.childId = undefined;
          });
        }
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
    // The slide background is a three-state override (own image → hidden → inherit
    // deck), so these patches keep `backgroundImage` and the `hideBackground` flag
    // in lockstep — an explicit image always wins, so it clears the flag.
    setSlideBackgroundImage: reconcilingSlideMutation<
      SetSlideBackgroundImageApiArg,
      SlideResponse
    >(
      (draft, arg) => {
        withSlide(draft, arg.slideId, (slide) => {
          slide.backgroundImage = arg.setImageRequest.image;
          slide.hideBackground = false;
        });
      },
      (draft, data) => {
        upsertSlideById(draft, data);
      },
    ),
    // "Reset to deck": drop the own image AND the suppress flag so the slide
    // inherits the deck default again.
    clearSlideBackgroundImage: reconcilingSlideMutation<
      ClearSlideBackgroundImageApiArg,
      SlideResponse
    >(
      (draft, arg) => {
        withSlide(draft, arg.slideId, (slide) => {
          slide.backgroundImage = undefined;
          slide.hideBackground = false;
        });
      },
      (draft, data) => {
        upsertSlideById(draft, data);
      },
    ),
    // "Remove background": no own image, deck default suppressed — the third state.
    hideSlideBackground: reconcilingSlideMutation<
      HideSlideBackgroundApiArg,
      SlideResponse
    >(
      (draft, arg) => {
        withSlide(draft, arg.slideId, (slide) => {
          slide.backgroundImage = undefined;
          slide.hideBackground = true;
        });
      },
      (draft, data) => {
        upsertSlideById(draft, data);
      },
    ),
    // Background color is the color counterpart to the background image, but it
    // composes BEHIND the image and is independent of the hideBackground flag —
    // so these patches only touch `backgroundColor`, leaving the image state
    // (and the suppress flag) untouched. Set writes the own color; clear drops it
    // back to deck inheritance.
    setSlideBackgroundColor: reconcilingSlideMutation<
      SetSlideBackgroundColorApiArg,
      SlideResponse
    >(
      (draft, arg) => {
        withSlide(draft, arg.slideId, (slide) => {
          slide.backgroundColor = arg.setColorRequest.color;
        });
      },
      (draft, data) => {
        upsertSlideById(draft, data);
      },
    ),
    clearSlideBackgroundColor: reconcilingSlideMutation<
      ClearSlideBackgroundColorApiArg,
      SlideResponse
    >(
      (draft, arg) => {
        withSlide(draft, arg.slideId, (slide) => {
          slide.backgroundColor = undefined;
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
    // optimistic patch reorders the rail instantly, moving a parent/follow-up
    // pair as one block and snapping a target that falls inside another pair
    // past it — the same normalization the server applies, so the reconcile
    // doesn't visibly "jump". Minor divergence self-heals from the response.
    moveSlide: reconcilingSlideMutation<MoveSlideApiArg, SlideResponse[]>(
      (draft, arg) => {
        const units = groupIntoUnits(draft);
        const from = units.findIndex((unit) => unit.head.id === arg.slideId);
        if (from === -1) return;
        const [moved] = units.splice(from, 1);
        let to = 0;
        let flat = 0;
        for (const unit of units) {
          if (arg.moveSlideRequest.to <= flat) break;
          flat += unit.followUp ? 2 : 1;
          to += 1;
        }
        units.splice(to, 0, moved);
        const next = units.flatMap((unit) =>
          unit.followUp ? [unit.head, unit.followUp] : [unit.head],
        );
        draft.splice(0, draft.length, ...next);
      },
      (draft, data) => {
        draft.splice(0, draft.length, ...data);
      },
    ),
  },
});
