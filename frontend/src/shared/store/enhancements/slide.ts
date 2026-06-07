/**
 * Tag + optimism rules for the slim slide API (the deck editor's left rail).
 *
 * `listSlides` is the single source of truth for a deck's slide collection, so
 * we tag it `{ type: 'Slide', id: deckId }` — the tag id is the *owning deck*,
 * meaning the whole list is one cache entry. Every slide mutation is
 * deck-scoped, so each invalidates that one tag and RTK Query refetches the
 * canonical order. The server owns the LexoRank `sortOrder` key (and stamps
 * audit ids / version), so a refetch — not a hand-spliced response — is the
 * only way to land the real post-mutation state.
 *
 * Each mutation also patches `listSlides` optimistically via `onQueryStarted`
 * so the rail reflects the edit before the round trip; the invalidation
 * refetch then reconciles against server truth. On reject we undo the patch.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import { Ambi, type SlideRequest, type SlideResponse } from "../AmbiApi";

/** Tag for a deck's whole slide list, keyed by the owning deck id. */
const slideTag = (deckId: string) => [{ type: "Slide" as const, id: deckId }];

/**
 * Project a SlideRequest into a SlideResponse for optimistic insertion. The
 * server stamps audit fields + the LexoRank `sortOrder` on confirm; until the
 * reconciling refetch lands we fill the required ones with empty placeholders
 * that the refetch overwrites.
 */
const optimisticSlide = (request: SlideRequest): SlideResponse => ({
  ...request,
  id: request.id ?? crypto.randomUUID(),
  createdByUserId: "",
  lastEditedByUserId: "",
});

Ambi.enhanceEndpoints({
  addTagTypes: ["Slide"],
  endpoints: {
    listDeckSlides: {
      providesTags: (_result, _error, arg) => slideTag(arg.id),
    },
    addSlide: {
      invalidatesTags: (_result, _error, arg) => slideTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("listDeckSlides", { id: arg.id }, (draft) => {
            draft.push(optimisticSlide(arg.slideRequest));
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    updateSlide: {
      invalidatesTags: (_result, _error, arg) => slideTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("listDeckSlides", { id: arg.id }, (draft) => {
            const idx = draft.findIndex((slide) => slide.id === arg.slideId);
            if (idx !== -1) draft[idx] = { ...draft[idx], ...arg.slideRequest };
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    removeSlide: {
      invalidatesTags: (_result, _error, arg) => slideTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("listDeckSlides", { id: arg.id }, (draft) => {
            const idx = draft.findIndex((slide) => slide.id === arg.slideId);
            if (idx !== -1) draft.splice(idx, 1);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    // Cover/background images have a dedicated home (separate from updateSlide)
    // so a content edit never clobbers them, and the future upload pipeline has
    // a route to grow into. Each optimistically patches the slide in listSlides;
    // the invalidation refetch reconciles (the backend may rewrite srcKey /
    // variants once real uploads land).
    setSlideCoverImage: {
      invalidatesTags: (_result, _error, arg) => slideTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("listDeckSlides", { id: arg.id }, (draft) => {
            const slide = draft.find((s) => s.id === arg.slideId);
            if (slide) slide.coverImage = arg.setImageRequest.image;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    clearSlideCoverImage: {
      invalidatesTags: (_result, _error, arg) => slideTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("listDeckSlides", { id: arg.id }, (draft) => {
            const slide = draft.find((s) => s.id === arg.slideId);
            if (slide) slide.coverImage = undefined;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    setSlideBackgroundImage: {
      invalidatesTags: (_result, _error, arg) => slideTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("listDeckSlides", { id: arg.id }, (draft) => {
            const slide = draft.find((s) => s.id === arg.slideId);
            if (slide) slide.backgroundImage = arg.setImageRequest.image;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    clearSlideBackgroundImage: {
      invalidatesTags: (_result, _error, arg) => slideTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("listDeckSlides", { id: arg.id }, (draft) => {
            const slide = draft.find((s) => s.id === arg.slideId);
            if (slide) slide.backgroundImage = undefined;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    // Point/answer settings live on `slide.settings` but, like the image slots,
    // have their own dedicated endpoints (separate from updateSlide) so a content
    // edit never clobbers them. Each optimistically patches the slide in
    // listSlides; the invalidation refetch reconciles against server truth.
    setSlidePointSettings: {
      invalidatesTags: (_result, _error, arg) => slideTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("listDeckSlides", { id: arg.id }, (draft) => {
            const slide = draft.find((s) => s.id === arg.slideId);
            if (slide)
              slide.settings = {
                ...slide.settings,
                pointSettings: arg.setPointSettingsRequest.pointSettings,
              };
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    clearSlidePointSettings: {
      invalidatesTags: (_result, _error, arg) => slideTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("listDeckSlides", { id: arg.id }, (draft) => {
            const slide = draft.find((s) => s.id === arg.slideId);
            if (slide?.settings) slide.settings.pointSettings = undefined;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    setSlideAnswerSettings: {
      invalidatesTags: (_result, _error, arg) => slideTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("listDeckSlides", { id: arg.id }, (draft) => {
            const slide = draft.find((s) => s.id === arg.slideId);
            if (slide)
              slide.settings = {
                ...slide.settings,
                answerSettings: arg.setAnswerSettingsRequest.answerSettings,
              };
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    clearSlideAnswerSettings: {
      invalidatesTags: (_result, _error, arg) => slideTag(arg.id),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("listDeckSlides", { id: arg.id }, (draft) => {
            const slide = draft.find((s) => s.id === arg.slideId);
            if (slide?.settings) slide.settings.answerSettings = undefined;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    },
    moveSlide: {
      // No invalidation: moveSlide returns the deck's slides in their new
      // canonical order (with the server-owned LexoRank `sortOrder` keys), so we
      // reconcile by writing that response straight into listSlides — no extra
      // GET /slides round-trip per drag. The optimistic patch below reorders the
      // rail instantly; the response then lands the authoritative order + keys.
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          Ambi.util.updateQueryData("listDeckSlides", { id: arg.id }, (draft) => {
            const from = draft.findIndex((slide) => slide.id === arg.slideId);
            if (from === -1) return;
            const to = Math.max(
              0,
              Math.min(arg.moveSlideRequest.to, draft.length - 1),
            );
            const [moved] = draft.splice(from, 1);
            draft.splice(to, 0, moved);
          }),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            Ambi.util.updateQueryData("listDeckSlides", { id: arg.id }, () => data),
          );
        } catch {
          patch.undo();
        }
      },
    },
  },
});
