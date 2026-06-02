/**
 * Hook for running a deck as a live presentation / interactive session.
 *
 * This is a placeholder: the real flow (create an InteractiveSession from the
 * deck, then navigate to the room) is not built yet. `present(deckId)` logs so
 * callers — deck cards, the editor — can wire the UI today and have it light up
 * for free once the implementation lands.
 */
interface UseLiveSessionResult {
  /** Start presenting the given deck. Not yet implemented. */
  present: (deckId: string) => void;
}

const useLiveSession = (): UseLiveSessionResult => {
  const present = (deckId: string): void => {
    console.log("not yet implemented", deckId);
  };

  return { present };
};

export { useLiveSession };
export type { UseLiveSessionResult };
