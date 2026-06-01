// Deck layer between the generated deck API and the deck editor. Wraps the
// single-deck query plus every deck-lifecycle mutation behind intent-level
// handlers (rename, setVisibility, share, …) with optimistic cache updates
// baked in, so the editor never touches RTK Query directly. Also owns
// optimistic deck *creation* — the flow previously inline in MyDecksPage —
// since the new deck's id is client-minted and seeded into the cache before
// the round trip.
import {
  Ambi,
  useGetDeckQuery,
  useCreate1Mutation,
  useUpdateDeckMutation,
  useDeleteDeckMutation,
  useSetVisibilityMutation,
  useShareMutation,
  useRevokeShareMutation,
  useAddSlideMutation,
  type DeckResponse,
  type SetVisibilityRequest,
  type ShareDeckRequest,
  type UpdateDeckRequest,
} from "@/store/AmbiApi";
import { useAppDispatch } from "@/store/hooks";
import { buildNewSlide, optimisticSlide } from "./useSlide";

const DEFAULT_DECK_NAME = "Untitled Deck";

/** Full DeckResponse for the optimistic seed — the real response overwrites it. */
const buildOptimisticDeck = (id: string, name: string): DeckResponse => {
  const now = new Date().toISOString();
  return {
    id,
    publicId: id,
    name,
    version: 0,
    publishStatus: "DRAFT",
    visibility: "PRIVATE",
    language: "en",
    creatorUserId: "",
    originalAuthorUserId: "",
    tags: [],
    ownership: { type: "USER" },
    acl: [],
    createdAt: now,
    updatedAt: now,
  };
};

interface CreatedDeck {
  deckId: string;
  firstSlideId: string;
}

interface UseDeckResult {
  deck: DeckResponse | undefined;
  isLoading: boolean;
  error: unknown;
  /**
   * Create a new deck (+ a first slide so the editor never opens onto an empty
   * rail). Mints the ids, seeds the getDeck + listSlides caches optimistically,
   * then persists in the background. Returns the new ids so the caller can
   * navigate to the editor.
   */
  createDeck: (name?: string) => CreatedDeck;
  rename: (name: string) => void;
  /** Patch deck fields optimistically (PATCH, partial). */
  updateDeck: (patch: UpdateDeckRequest) => void;
  setVisibility: (visibility: SetVisibilityRequest["visibility"]) => void;
  share: (userId: string, role: ShareDeckRequest["role"]) => void;
  revokeShare: (userId: string) => void;
  /** Delete the deck; returns the mutation promise so callers can await it. */
  remove: () => Promise<unknown> | undefined;
}

/**
 * @param deckId the deck to read + mutate; omit when the hook is only used to
 *   create a deck (e.g. a "New deck" button), so the getDeck query stays idle.
 */
const useDeck = (deckId?: string): UseDeckResult => {
  const dispatch = useAppDispatch();
  const {
    data: deck,
    isLoading,
    error,
  } = useGetDeckQuery({ id: deckId ?? "" }, { skip: !deckId });

  const [createDeckMutation] = useCreate1Mutation();
  const [updateDeckMutation] = useUpdateDeckMutation();
  const [deleteDeckMutation] = useDeleteDeckMutation();
  const [setVisibilityMutation] = useSetVisibilityMutation();
  const [shareMutation] = useShareMutation();
  const [revokeShareMutation] = useRevokeShareMutation();
  const [addSlideMutation] = useAddSlideMutation();

  const createDeck = (name: string = DEFAULT_DECK_NAME): CreatedDeck => {
    const newDeckId = crypto.randomUUID();
    const firstSlideId = crypto.randomUUID();
    const firstSlide = buildNewSlide("TITLE", firstSlideId);

    // Seed both caches so the editor opens fully populated before any request.
    void dispatch(
      Ambi.util.upsertQueryData(
        "getDeck",
        { id: newDeckId },
        buildOptimisticDeck(newDeckId, name),
      ),
    );
    void dispatch(
      Ambi.util.upsertQueryData("listSlides", { id: newDeckId }, [
        optimisticSlide(firstSlide),
      ]),
    );

    // create1 is an idempotent PUT that just persists the id; the name (PATCH)
    // and first slide (POST) land on the now-existing deck, in order.
    void createDeckMutation({ id: newDeckId })
      .unwrap()
      .then(() =>
        updateDeckMutation({
          id: newDeckId,
          updateDeckRequest: { name },
        }).unwrap(),
      )
      .then((updated) => {
        void dispatch(
          Ambi.util.upsertQueryData("getDeck", { id: newDeckId }, updated),
        );
        return addSlideMutation({
          id: newDeckId,
          slideRequest: firstSlide,
        }).unwrap();
      })
      .then((slide) => {
        dispatch(
          Ambi.util.updateQueryData("listSlides", { id: newDeckId }, (draft) => {
            const idx = draft.findIndex((s) => s.id === firstSlideId);
            if (idx !== -1) draft[idx] = slide;
            else draft.push(slide);
          }),
        );
      })
      .catch((err: unknown) => {
        console.error("Failed to create deck", err);
      });

    return { deckId: newDeckId, firstSlideId };
  };

  /** Optimistically patch getDeck, fire the PATCH, splice the canonical reply. */
  const updateDeck = (patch: UpdateDeckRequest) => {
    if (!deckId) return;
    const optimistic = dispatch(
      Ambi.util.updateQueryData("getDeck", { id: deckId }, (draft) => {
        Object.assign(draft, patch);
      }),
    ) as { undo: () => void };

    void updateDeckMutation({ id: deckId, updateDeckRequest: patch })
      .unwrap()
      .then((updated) => {
        void dispatch(
          Ambi.util.upsertQueryData("getDeck", { id: deckId }, updated),
        );
      })
      .catch((err: unknown) => {
        optimistic.undo();
        console.error("Failed to update deck", err);
      });
  };

  const rename = (name: string) => {
    updateDeck({ name });
  };

  const setVisibility = (visibility: SetVisibilityRequest["visibility"]) => {
    if (!deckId) return;
    const optimistic = dispatch(
      Ambi.util.updateQueryData("getDeck", { id: deckId }, (draft) => {
        draft.visibility = visibility;
      }),
    ) as { undo: () => void };

    void setVisibilityMutation({
      id: deckId,
      setVisibilityRequest: { visibility },
    })
      .unwrap()
      .then((updated) => {
        void dispatch(
          Ambi.util.upsertQueryData("getDeck", { id: deckId }, updated),
        );
      })
      .catch((err: unknown) => {
        optimistic.undo();
        console.error("Failed to set deck visibility", err);
      });
  };

  // Share mutations return the full DeckResponse; we splice it in on success
  // rather than patch the acl optimistically (the new grant needs server data).
  const share = (userId: string, role: ShareDeckRequest["role"]) => {
    if (!deckId) return;
    void shareMutation({ id: deckId, userId, shareDeckRequest: { role } })
      .unwrap()
      .then((updated) => {
        void dispatch(
          Ambi.util.upsertQueryData("getDeck", { id: deckId }, updated),
        );
      })
      .catch((err: unknown) => {
        console.error("Failed to share deck", err);
      });
  };

  const revokeShare = (userId: string) => {
    if (!deckId) return;
    void revokeShareMutation({ id: deckId, userId })
      .unwrap()
      .then((updated) => {
        void dispatch(
          Ambi.util.upsertQueryData("getDeck", { id: deckId }, updated),
        );
      })
      .catch((err: unknown) => {
        console.error("Failed to revoke deck share", err);
      });
  };

  const remove = () => {
    if (!deckId) return undefined;
    return deleteDeckMutation({ id: deckId }).unwrap();
  };

  return {
    deck,
    isLoading,
    error,
    createDeck,
    rename,
    updateDeck,
    setVisibility,
    share,
    revokeShare,
    remove,
  };
};

export { useDeck };
export type { UseDeckResult, CreatedDeck };
