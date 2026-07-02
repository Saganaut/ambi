// Generic "pick a subset with a cardinality cap" selection primitive, shared by
// every answer surface that lets a participant choose from a set of items — MCQ
// today, and the not-yet-built question types (ranking, matching, grid, place-on-
// image, allocation, …) that will read the same `maxSelections` answer setting.
//
// The cap is the raw `AnswerSettings.maxSelections` (see the backend
// `AnswerSettingsView`): `1` = single-select, `0` = unlimited, `>1` = capped at N.
// Only the selection bookkeeping lives here; each question type owns how its items
// render and how the chosen ids become an answer payload.
import { useCallback, useEffect, useState } from "react";

/**
 * Applies a toggle of `id` against the current `selected` set under a
 * `maxSelections` cap, returning the next selection (never mutates the input):
 *   - already selected → deselected;
 *   - `max === 1` (single-select) → replaces the selection with just `id`;
 *   - `max > 1` and already at the cap → unchanged (the add is blocked);
 *   - otherwise (`max === 0` unlimited, or under the cap) → `id` is added.
 */
export const toggleCapped = (
  selected: readonly string[],
  id: string,
  max: number,
): string[] => {
  if (selected.includes(id)) {
    return selected.filter((s) => s !== id);
  }
  if (max === 1) {
    return [id];
  }
  if (max > 1 && selected.length >= max) {
    return [...selected];
  }
  return [...selected, id];
};

/** Whether no further items may be added (a `>1` cap that is already full). */
export const isAtCap = (selected: readonly string[], max: number): boolean =>
  max > 1 && selected.length >= max;

/**
 * Selection state for a capped multi-select answer surface. `resetKey` clears the
 * selection whenever it changes (pass the slide/round id so a new round starts
 * blank). Returns the ordered selection plus toggle/query/clear helpers.
 */
export const useCappedSelection = (max: number, resetKey: string) => {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setSelected([]);
  }, [resetKey]);

  const toggle = useCallback(
    (id: string) => {
      setSelected((prev) => toggleCapped(prev, id, max));
    },
    [max],
  );

  const isSelected = useCallback(
    (id: string) => selected.includes(id),
    [selected],
  );

  const clear = useCallback(() => {
    setSelected([]);
  }, []);

  return {
    selected,
    toggle,
    isSelected,
    clear,
    /** True when a `>1` cap is full — unselected items should be blocked. */
    atCap: isAtCap(selected, max),
  };
};
