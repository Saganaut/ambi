/**
 * Cache-sync rules for the three "apply to deck" promote mutations: each
 * atomically sets a new deck-level default AND clears every slide's per-slide
 * override for that field in one backend round-trip.
 *
 * These endpoints are generated into `deckApi.gen.ts`, so the behavior is
 * layered on with `enhanceEndpoints` (not `injectEndpoints`, which would be
 * silently ignored as a duplicate). Each `onQueryStarted`:
 *   - Optimistically patches `getDeck` with the new deck-level value.
 *   - Optimistically clears the affected field from every slide in the
 *     `listDeckSlides` cache (a slide override otherwise takes precedence over
 *     the deck default, so the promote would look like a no-op).
 *   - On success replaces the `getDeck` entry with the authoritative response.
 *   - On reject undoes both patches.
 *
 * Imported for its side effect via the `../../../../shared/store/apiEnhancements`
 * barrel.
 */
import { CacheSyncMutationApi } from "@/shared/store/enhancements/Enhancements.types";
import {
  deckApi,
  type DeckResponse,
  type PromoteAnswerSettingsToDeckApiArg,
  type PromoteBackgroundColorToDeckApiArg,
  type PromoteBackgroundImageToDeckApiArg,
  type PromotePointSettingsToDeckApiArg,
} from "../deckApi.gen";

deckApi.enhanceEndpoints({
  endpoints: {
    promotePointSettingsToDeck: {
      onQueryStarted: async (
        arg: PromotePointSettingsToDeckApiArg,
        { dispatch, queryFulfilled }: CacheSyncMutationApi<DeckResponse>,
      ) => {
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
    },

    promoteAnswerSettingsToDeck: {
      onQueryStarted: async (
        arg: PromoteAnswerSettingsToDeckApiArg,
        { dispatch, queryFulfilled }: CacheSyncMutationApi<DeckResponse>,
      ) => {
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
    },

    promoteBackgroundImageToDeck: {
      onQueryStarted: async (
        arg: PromoteBackgroundImageToDeckApiArg,
        { dispatch, queryFulfilled }: CacheSyncMutationApi<DeckResponse>,
      ) => {
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
    },

    promoteBackgroundColorToDeck: {
      onQueryStarted: async (
        arg: PromoteBackgroundColorToDeckApiArg,
        { dispatch, queryFulfilled }: CacheSyncMutationApi<DeckResponse>,
      ) => {
        const deckPatch = dispatch(
          deckApi.util.updateQueryData("getDeck", { id: arg.id }, (draft) => {
            draft.backgroundColor = arg.setColorRequest.color;
          }),
        );
        const slidesPatch = dispatch(
          deckApi.util.updateQueryData(
            "listDeckSlides",
            { id: arg.id },
            (draft) => {
              // Every slide falls through to the new deck color: drop the
              // per-slide color override only. Unlike the image promote, the
              // shared hideBackground flag is left untouched — promoting a color
              // must not un-suppress a slide that opted out of the background.
              for (const slide of draft) {
                slide.backgroundColor = undefined;
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
    },
  },
});
