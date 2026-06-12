/**
 * The three "apply to deck" promote mutations: each atomically sets the new
 * deck-level default AND clears every slide's per-slide override for that
 * field in one backend round-trip.
 *
 * These endpoints don't appear in the auto-generated `deckApi.gen.ts` yet
 * (they were added after the last codegen run), so they are injected here as a
 * hand-written extension. Once the backend is running and `npm run generate`
 * is re-run, move them into the generated file and delete this one.
 *
 * Cache sync is inline in each mutation's `onQueryStarted`:
 *   - Optimistically patch `getDeck` (settings) and `listDeckSlides` (clear the
 *     affected field from every slide) before the round trip.
 *   - On success, replace the `getDeck` entry with the authoritative response;
 *     the slides patch is already correct so no second pass is needed.
 *   - On reject, undo both patches.
 */
import {
  deckApi,
  type DeckResponse,
  type SetAnswerSettingsRequest,
  type SetImageRequest,
  type SetPointSettingsRequest,
} from "./deckApi.gen";

const promoteDeckApi = deckApi.injectEndpoints({
  endpoints: (build) => ({
    promotePointSettingsToDeck: build.mutation<
      DeckResponse,
      { id: string; setPointSettingsRequest: SetPointSettingsRequest }
    >({
      query: (arg) => ({
        url: `/api/decks/${arg.id}/point-settings/promote`,
        method: "PUT",
        body: arg.setPointSettingsRequest,
      }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const deckPatch = dispatch(
          deckApi.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
            draft.settings = {
              ...draft.settings,
              pointSettings: arg.setPointSettingsRequest.pointSettings,
            };
          }),
        );
        const slidesPatch = dispatch(
          deckApi.util.updateQueryData(
            "listDeckSlides",
            { id: arg.id },
            (draft) => {
              for (const slide of draft) {
                if (slide.settings?.pointSettings != null) {
                  slide.settings.pointSettings = undefined;
                }
              }
            },
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            deckApi.util.updateQueryData("getDeck", { id: arg.id }, () => data),
          );
        } catch {
          deckPatch.undo();
          slidesPatch.undo();
        }
      },
    }),

    promoteAnswerSettingsToDeck: build.mutation<
      DeckResponse,
      { id: string; setAnswerSettingsRequest: SetAnswerSettingsRequest }
    >({
      query: (arg) => ({
        url: `/api/decks/${arg.id}/answer-settings/promote`,
        method: "PUT",
        body: arg.setAnswerSettingsRequest,
      }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const deckPatch = dispatch(
          deckApi.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
            draft.settings = {
              ...draft.settings,
              answerSettings: arg.setAnswerSettingsRequest.answerSettings,
            };
          }),
        );
        const slidesPatch = dispatch(
          deckApi.util.updateQueryData(
            "listDeckSlides",
            { id: arg.id },
            (draft) => {
              for (const slide of draft) {
                if (slide.settings?.answerSettings != null) {
                  slide.settings.answerSettings = undefined;
                }
              }
            },
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            deckApi.util.updateQueryData("getDeck", { id: arg.id }, () => data),
          );
        } catch {
          deckPatch.undo();
          slidesPatch.undo();
        }
      },
    }),

    promoteBackgroundImageToDeck: build.mutation<
      DeckResponse,
      { id: string; setImageRequest: SetImageRequest }
    >({
      query: (arg) => ({
        url: `/api/decks/${arg.id}/background-image/promote`,
        method: "PUT",
        body: arg.setImageRequest,
      }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const deckPatch = dispatch(
          deckApi.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
            draft.backgroundImage = arg.setImageRequest.image;
          }),
        );
        const slidesPatch = dispatch(
          deckApi.util.updateQueryData(
            "listDeckSlides",
            { id: arg.id },
            (draft) => {
              // Every slide falls through to the new deck default: drop both the
              // per-slide image override and the hideBackground suppress flag,
              // mirroring the atomic backend unset.
              for (const slide of draft) {
                slide.backgroundImage = undefined;
                slide.hideBackground = false;
              }
            },
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            deckApi.util.updateQueryData("getDeck", { id: arg.id }, () => data),
          );
        } catch {
          deckPatch.undo();
          slidesPatch.undo();
        }
      },
    }),
  }),
});

export const {
  usePromotePointSettingsToDeckMutation,
  usePromoteAnswerSettingsToDeckMutation,
  usePromoteBackgroundImageToDeckMutation,
} = promoteDeckApi;
