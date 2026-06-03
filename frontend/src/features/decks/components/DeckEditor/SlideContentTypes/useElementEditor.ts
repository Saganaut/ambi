/**
 * Shared plumbing for slide-content editors. Each kind-specific editor owns
 * its own local-state shape, but the read/write boundary is identical: pull
 * the active element from the deck cache, debounce a commit, and flush on
 * blur / structural change. This hook centralises that.
 *
 * Returns:
 *   - element        — the active element, narrowed to T by the caller's
 *                      `selectKind` predicate; undefined while loading or if
 *                      the active element is of a different kind.
 *   - schedule(p)    — debounced PUT /elements/{id}.
 *   - flush()        — fire the buffered commit now (use on blur).
 *   - commit(p)      — fire immediately (use for structural changes —
 *                      add/remove option, etc.).
 *   - syncedFromId   — last element.id we synced local state from. Editors
 *                      compare this against `element.id` during render to
 *                      decide whether to reset their local mirror.
 *   - markSynced(id) — update syncedFromId after a successful resync.
 */
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { isSortable } from "@dnd-kit/dom/sortable";
import type { DragEndEvent } from "@dnd-kit/dom";
import { useCurrentUser } from "@auth/hooks/useCurrentUser";
import { useDebouncedCommit } from "@shared/hooks/useDebouncedCommit";
import { DeckResponse, useGetDeckQuery, McqOption, Ambi } from "@store/AmbiApi";
import { useAppDispatch } from "@store/hooks";
// TODO(migration): stubbed pending slide-block migration. These block types
// + helpers used to come from `@store/slideBlockTypes`; they're now local
// placeholders defined in the SlideContent editor's types module.
import {
  type SlideBlockUnion,
  narrowSlideBlock,
  type SlideBlockKind,
  createSlideBlock,
} from "./SlideContent/types";
import {
  McqQuestion,
  TextQuestion,
  NumberQuestion,
  WordCloudQuestion,
  QAndAQuestion,
  DrawingQuestion,
  PlaceOnImageQuestion,
  GridQuestion,
  AllocationQuestion,
  MatchingQuestion,
  MatchingPair,
  RankingQuestion,
  RankingItem,
  ScalesQuestion,
  Slide,
} from "@shared/types/elements";

type DeckElement = NonNullable<DeckResponse["elements"]>[number];

/** Shared option-count bounds for MCQ-shaped questions. Enforced inside
 *  the hooks so out-of-bounds calls are silent no-ops rather than corrupt
 *  saves; exported so callers can hide their UI when at the bound. */
const MIN_MCQ_OPTIONS = 2;
const MAX_MCQ_OPTIONS = 6;

const isMcqQuestion = (e: DeckElement): e is McqQuestion =>
  e.kind === "McqQuestion";

const routeApi = getRouteApi("/decks/$deckId/edit");

interface ElementEditorApi<T extends DeckElement> {
  element: T | undefined;
  schedule: (patch: T) => void;
  flush: () => void;
  commit: (patch: T) => void;
  syncedFromId: string | undefined;
  markSynced: (id: string | undefined) => void;
}

const useElementEditor = <T extends DeckElement>(
  selectKind: (e: DeckElement) => e is T,
  delay = 500,
): ElementEditorApi<T> => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const currentUser = useCurrentUser();
  const currentUserId =
    currentUser.state === "registered" || currentUser.state === "guest"
      ? currentUser.user.id
      : undefined;

  const { element } = useGetDeckQuery(
    { id: deckId },
    {
      selectFromResult: ({ data }) => {
        const e = data?.elements?.find((el) => el.id === slideId);
        return { element: e && selectKind(e) ? e : undefined };
      },
    },
  );

  const [updateElement] = useUpdateElementMutation();

  // Optimistic provenance stamp (chunk 10b). The backend overwrites these on
  // save, but stamping client-side gives the in-flight cache patch the right
  // version + author for the editor's "last edited by" footer to render
  // immediately. `version` bumps off whatever the patch carries, which is
  // built from the cached element above.
  const commit = (patch: T) => {
    if (!element?.id) return;
    // chunk 25 — chrome now owns lastEditedByUserId / version, so the stamp
    // lands inside the (possibly partial) chrome object the patch already
    // carries. If the patch didn't touch chrome we synthesize a minimal one
    // so the optimistic version bump still flows.
    const existingChrome = (patch as { chrome?: { version?: number } }).chrome;
    const stampedPatch: T = {
      ...patch,
      chrome: {
        ...(element.chrome ?? {}),
        ...(existingChrome ?? {}),
        lastEditedByUserId: currentUserId,
        version: (existingChrome?.version ?? element.chrome?.version ?? 0) + 1,
      },
    };
    void updateElement({
      id: deckId,
      elementId: element.id,
      body: stampedPatch,
    })
      .unwrap()
      .catch((err: unknown) => {
        console.error("Failed to update element", err);
      });
  };

  const { schedule, flush } = useDebouncedCommit<T>(commit, delay);

  const [syncedFromId, setSyncedFromId] = useState<string | undefined>(
    element?.id,
  );

  return {
    element,
    schedule,
    flush,
    commit,
    syncedFromId,
    markSynced: setSyncedFromId,
  };
};

/**
 * Option-scoped editor on top of `useElementEditor<McqQuestion>`. The active
 * deck element must be an `McqQuestion`; the hook finds the option by id
 * inside `parent.options` and returns helpers that rebuild the parent
 * question with that single option swapped, then route the commit through
 * the shared deck-element mutation pipeline.
 *
 * Why this lives next to `useElementEditor`:
 *   `McqOption` is embedded in `McqQuestion`, which is what the
 *   `updateElement` mutation actually accepts. There is no per-option
 *   endpoint — every option edit becomes a full McqQuestion write. This
 *   hook keeps that mechanical detail out of the option-editor component
 *   and reuses the existing debouncer/cache-sync plumbing.
 *
 * Concurrency note: each option editor instance owns its own debounce
 * timer (because `useElementEditor` is called once per option editor). In
 * practice this is safe because only one input can hold focus at a time,
 * and every input flushes on blur — switching from option A to option B
 * fires A's pending commit first. Color/image clicks commit immediately,
 * sidestepping the debounce window entirely.
 */
interface McqOptionEditorApi {
  /** The freshest option from the deck cache, narrowed by id. Undefined
   *  while the deck is loading or if the active element isn't an MCQ. */
  option: McqOption | undefined;
  /** Parent question — exposed for callers that need sibling option
   *  context (e.g. cache mutation keyed off the question id). */
  parent: McqQuestion | undefined;

  // ── field-level commits (option's own shape) ─────────────────────────
  /** Debounced commit of `next` as the new value for this option id. */
  schedule: (next: McqOption) => void;
  /** Immediate commit of `next` (use for structural changes — image pick,
   *  color swatch click, etc.). */
  commit: (next: McqOption) => void;
  /** Flush the pending debounced commit (typical: onBlur). Also called
   *  internally before structural ops below. */
  flush: () => void;

  // ── derived parent-state, scoped to this option ──────────────────────
  /** Zero-based position in `parent.options`. -1 if not found. */
  index: number;
  /** Whether this option's id is in `parent.correctOptionIds`. */
  isCorrect: boolean;
  /** Whether the parent has more than `MIN_MCQ_OPTIONS` options (so
   *  removing this one is allowed). */
  canRemove: boolean;

  // ── question-shape ops scoped to this option (immediate commits) ────
  /** Flip this option's id in `parent.correctOptionIds`. */
  toggleCorrect: () => void;
  /** Remove this option from `parent.options` and strip its id from
   *  `parent.correctOptionIds`. No-op below the min-option bound. */
  remove: () => void;

  syncedFromId: string | undefined;
  markSynced: (id: string | undefined) => void;
}

const useMcqOptionEditor = (
  optionId: string | undefined,
  delay = 500,
): McqOptionEditorApi => {
  const {
    element: parent,
    schedule: scheduleParent,
    commit: commitParent,
    flush,
    syncedFromId,
    markSynced,
  } = useElementEditor<McqQuestion>(isMcqQuestion, delay);

  const options = parent?.options ?? [];
  const index = optionId ? options.findIndex((o) => o.id === optionId) : -1;
  const option = index >= 0 ? options[index] : undefined;
  const isCorrect = !!(
    optionId && parent?.correctOptionIds?.includes(optionId)
  );
  const canRemove = options.length > MIN_MCQ_OPTIONS;

  /** Build a complete McqQuestion patch from `parent` with overrides
   *  applied. The defaults read from the cache, so concurrent edits in
   *  sibling McqOptionEditable instances aren't stomped (the latest
   *  flushed value is whatever's in `parent.options` right now). Returns
   *  undefined when there's no parent — callers treat that as a no-op. */
  const patchParent = (overrides: {
    options?: McqOption[];
    correctOptionIds?: string[];
  }): McqQuestion | undefined => {
    if (!parent) return undefined;
    return {
      ...parent,
      options: overrides.options ?? parent.options,
      correctOptionIds: overrides.correctOptionIds ?? parent.correctOptionIds,
    };
  };

  /** Patch this single option in place inside `parent.options`. */
  const replaceOption = (next: McqOption): McqOption[] | undefined => {
    if (!optionId) return undefined;
    return options.map((o) => (o.id === optionId ? next : o));
  };

  const schedule = (next: McqOption) => {
    const swapped = replaceOption(next);
    if (!swapped) return;
    const patched = patchParent({ options: swapped });
    if (patched) scheduleParent(patched);
  };

  const commit = (next: McqOption) => {
    const swapped = replaceOption(next);
    if (!swapped) return;
    const patched = patchParent({ options: swapped });
    if (patched) commitParent(patched);
  };

  const toggleCorrect = () => {
    if (!parent || !optionId) return;
    flush();
    const current = parent.correctOptionIds ?? [];
    const next = current.includes(optionId)
      ? current.filter((cid) => cid !== optionId)
      : [...current, optionId];
    const patched = patchParent({ correctOptionIds: next });
    if (patched) commitParent(patched);
  };

  const remove = () => {
    if (!parent || !optionId || !canRemove) return;
    flush();
    const nextOptions = options.filter((o) => o.id !== optionId);
    const nextCorrect = (parent.correctOptionIds ?? []).filter(
      (cid) => cid !== optionId,
    );
    const patched = patchParent({
      options: nextOptions,
      correctOptionIds: nextCorrect,
    });
    if (patched) commitParent(patched);
  };

  return {
    option,
    parent,
    schedule,
    commit,
    flush,
    index,
    isCorrect,
    canRemove,
    toggleCorrect,
    remove,
    syncedFromId,
    markSynced,
  };
};

/**
 * Question-scoped editor on top of `useElementEditor<McqQuestion>`. Owns
 * the genuinely *question-level* operations — prompt edits and appending
 * options. Per-option ops (text/image/color/remove/toggleCorrect) live on
 * `useMcqOptionEditor` so each option-card component owns its own commit
 * pipeline and there's no shared option-list state to fight over.
 *
 * Mutation semantics:
 *   - `schedulePrompt` is debounced (typing should feel responsive).
 *   - `addOption` commits immediately (structural changes are never
 *     debounced). The new option gets a fresh UUID and an empty text body
 *     so the renderer can show it the moment the round-trip lands.
 *
 * Bounds (`MIN_MCQ_OPTIONS` / `MAX_MCQ_OPTIONS`) are enforced inside the
 * hook — callers gate their UI on `canAddOption`, but a slipped call is a
 * no-op rather than a corrupted save.
 */
interface McqQuestionEditorApi {
  question: McqQuestion | undefined;
  schedulePrompt: (prompt: string) => void;
  flush: () => void;
  syncedFromId: string | undefined;
  markSynced: (id: string | undefined) => void;
  /** True when another option can be appended (below the max). */
  canAddOption: boolean;
  /** Append a blank option. Silent no-op at the max bound. */
  addOption: () => void;
  /** Sortable drop handler — reorders the option list and persists via the
   *  dedicated `moveMcqOption` endpoint (no whole-element write). */
  handleOptionDragEnd: (event: DragEndEvent) => void;
}

const useMcqQuestionEditor = (delay = 500): McqQuestionEditorApi => {
  const { deckId } = routeApi.useParams();
  const dispatch = useAppDispatch();
  const [moveMcqOption] = useMoveMcqOptionMutation();
  const {
    element: question,
    schedule,
    commit,
    flush,
    syncedFromId,
    markSynced,
  } = useElementEditor<McqQuestion>(isMcqQuestion, delay);

  const optionCount = question?.options?.length ?? 0;
  const canAddOption = optionCount < MAX_MCQ_OPTIONS;

  const schedulePrompt = (prompt: string) => {
    if (!question) return;
    schedule({ ...question, prompt });
  };

  const addOption = () => {
    if (!question || !canAddOption) return;
    flush();
    const nextOptions: McqOption[] = [
      ...(question.options ?? []),
      { id: crypto.randomUUID(), text: "" },
    ];
    commit({ ...question, options: nextOptions });
  };

  /**
   * Mirror of `useDeckEditor.handleDragEnd` but for MCQ options. The
   * source carries the @dnd-kit-tracked indices; we splice the option list
   * in the deck cache for instant UI feedback, then call the dedicated
   * `moveMcqOption` endpoint so the server only sees the reorder (not a
   * full McqQuestion rewrite). Any pending debounced text edit is flushed
   * first so this reorder doesn't race a stale option-text save.
   */
  const handleOptionDragEnd = (event: DragEndEvent) => {
    if (!question?.id) return;
    const { source } = event.operation;
    if (!isSortable(source)) return;
    const { initialIndex, index } = source;
    if (initialIndex === index) return;
    const options = question.options ?? [];
    const moved = options[initialIndex];
    if (!moved.id) return;
    const movedId = moved.id;
    const elementId = question.id;

    flush();

    dispatch(
      Ambi.util.updateQueryData("getDeck", { id: deckId }, (draft) => {
        const el = draft.elements?.find((e) => e.id === elementId);
        if (el?.kind !== "McqQuestion" || !el.options) return;
        const [item] = el.options.splice(initialIndex, 1);
        el.options.splice(index, 0, item);
      }),
    );

    void moveMcqOption({
      id: deckId,
      elementId,
      optionId: movedId,
      to: index,
    })
      .unwrap()
      .catch((err: unknown) => {
        console.error("Failed to move MCQ option", err);
      });
  };

  return {
    question,
    schedulePrompt,
    flush,
    syncedFromId,
    markSynced,
    canAddOption,
    addOption,
    handleOptionDragEnd,
  };
};

// ─────────────────────────────────────────────────────────────────────────
// Per-kind editor hooks (chunk 25).
//
// Every kind-specific author surface used to hand-roll the same plumbing
// inline: local-mirror per field, `buildPatch(overrides)`, manual bounds
// checks for collection caps, manual `flush()` before structural ops. The
// hooks below centralise that the same way `useMcqQuestionEditor` /
// `useMcqOptionEditor` already do for MCQ.
//
// Two shapes:
//   - Flat kinds (Text / Number / WordCloud / QAndA / Drawing /
//     PlaceOnImage / Grid): `useXxxEditor()` returns the narrowed `question`
//     plus `schedule` / `commit` / `flush`. Both `schedule` and `commit`
//     accept a Partial<T> and merge it on top of the cached element, so the
//     caller never has to rebuild the whole question.
//
//   - Collection kinds (Allocation / Matching / Ranking / Scales): in
//     addition to the flat API, `useXxxEditor()` exposes `items`,
//     `canAdd` / `canRemove`, and `addItem` / `removeItem` / `updateItem`.
//     A parallel `useXxxItemEditor(itemId)` hook scopes a single item the
//     way `useMcqOptionEditor` does for MCQ options, so when (later) a
//     per-item card component is extracted it owns its own debounce timer.
//
// Slide blocks: `useSlideEditor()` exposes title / slideKind / displaySeconds
// / audio / video plus block-list ops (addBlock / removeBlock / moveBlock /
// updateBlock). Per-block editor components remain inline for now; splitting
// each block kind into its own component is follow-up work.
// ─────────────────────────────────────────────────────────────────────────

/** Flat-kind editor API: every field-level write is a `Partial<T>` patch
 *  the hook merges on top of the current cached element. Structural ops
 *  also call `commit(...)`, but use the same merge — they just supply a
 *  bigger patch (typically the whole collection). */
interface FlatElementEditorApi<T extends DeckElement> {
  /** Narrowed active element from the deck cache. Undefined while loading
   *  or if the active element is of a different kind. */
  question: T | undefined;
  /** Debounced merge: `{ ...cached, ...patch }` then PUT. */
  schedule: (patch: Partial<T>) => void;
  /** Immediate merge: `{ ...cached, ...patch }` then PUT. */
  commit: (patch: Partial<T>) => void;
  /** Fire any pending debounced commit now. */
  flush: () => void;
  syncedFromId: string | undefined;
  markSynced: (id: string | undefined) => void;
}

/** Generic wrapper around `useElementEditor` that flips the field-level
 *  write surface from "give me the whole T" to "give me a partial patch".
 *  Reads default values from the deck cache so concurrent edits from
 *  sibling fields (or sibling option editors) never get stomped. */
const useFlatElementEditor = <T extends DeckElement>(
  predicate: (e: DeckElement) => e is T,
  delay = 500,
): FlatElementEditorApi<T> => {
  const { element, schedule, commit, flush, syncedFromId, markSynced } =
    useElementEditor<T>(predicate, delay);

  const schedulePatch = (patch: Partial<T>) => {
    if (!element) return;
    schedule({ ...element, ...patch });
  };

  const commitPatch = (patch: Partial<T>) => {
    if (!element) return;
    commit({ ...element, ...patch });
  };

  return {
    question: element,
    schedule: schedulePatch,
    commit: commitPatch,
    flush,
    syncedFromId,
    markSynced,
  };
};

// ── Text ───────────────────────────────────────────────────────────────────

const isTextQuestion = (e: DeckElement): e is TextQuestion =>
  e.kind === "TextQuestion";

/** Flat editor for `TextQuestion` (free-text answer with a canonical
 *  correct answer + accepted variants). No nested structure — every field
 *  goes through `schedule({...})` / `commit({...})`. */
const useTextQuestionEditor = (delay = 500) =>
  useFlatElementEditor<TextQuestion>(isTextQuestion, delay);

// ── Number ─────────────────────────────────────────────────────────────────

const isNumberQuestion = (e: DeckElement): e is NumberQuestion =>
  e.kind === "NumberQuestion";

/** Flat editor for `NumberQuestion`. The author's correctValue / tolerance
 *  / unitLabel / decimalPlaces all live on the same flat shape, so this is
 *  a thin pass-through. */
const useNumberQuestionEditor = (delay = 500) =>
  useFlatElementEditor<NumberQuestion>(isNumberQuestion, delay);

// ── Word Cloud ─────────────────────────────────────────────────────────────

const isWordCloudQuestion = (e: DeckElement): e is WordCloudQuestion =>
  e.kind === "WordCloudQuestion";

/** Flat editor for `WordCloudQuestion`. Banned-words list lives on
 *  `bannedWords: string[]`; the author UI splits a comma-separated input
 *  before calling `schedule({ bannedWords: ... })`. */
const useWordCloudEditor = (delay = 500) =>
  useFlatElementEditor<WordCloudQuestion>(isWordCloudQuestion, delay);

// ── Q & A ──────────────────────────────────────────────────────────────────

const isQAndAQuestion = (e: DeckElement): e is QAndAQuestion =>
  e.kind === "QAndAQuestion";

/** Flat editor for `QAndAQuestion`. Survey-only round with optional voting
 *  + auto-approve flags. */
const useQAndAEditor = (delay = 500) =>
  useFlatElementEditor<QAndAQuestion>(isQAndAQuestion, delay);

// ── Drawing ────────────────────────────────────────────────────────────────

const isDrawingQuestion = (e: DeckElement): e is DrawingQuestion =>
  e.kind === "DrawingQuestion";

/** Flat editor for `DrawingQuestion`. Backing image lives at the root
 *  (`backingImage`), not under a nested struct, so patching is direct. */
const useDrawingEditor = (delay = 500) =>
  useFlatElementEditor<DrawingQuestion>(isDrawingQuestion, delay);

// ── Place on Image ─────────────────────────────────────────────────────────

const isPlaceOnImageQuestion = (e: DeckElement): e is PlaceOnImageQuestion =>
  e.kind === "PlaceOnImageQuestion";

/** Flat editor for `PlaceOnImageQuestion`. correctX/Y/tolerance are
 *  normalised 0–1; the editor enforces no bounds here — the input
 *  components do. */
const usePlaceOnImageEditor = (delay = 500) =>
  useFlatElementEditor<PlaceOnImageQuestion>(isPlaceOnImageQuestion, delay);

// ── Grid ───────────────────────────────────────────────────────────────────

const isGridQuestion = (e: DeckElement): e is GridQuestion =>
  e.kind === "GridQuestion";

/** Flat editor for `GridQuestion`. The backing image lives under
 *  `cells.backingImage`; callers patch by passing
 *  `schedule({ cells: { ...question.cells, backingImage: img } })`. */
const useGridQuestionEditor = (delay = 500) =>
  useFlatElementEditor<GridQuestion>(isGridQuestion, delay);

// ─────────────────────────────────────────────────────────────────────────
// Collection-kind shared bounds. Same MIN/MAX pattern as MCQ — exported so
// callers can hide their add/remove buttons at the bound. The hook short-
// circuits on out-of-bounds calls so a slipped click is a no-op rather
// than a corrupt save.
// ─────────────────────────────────────────────────────────────────────────

const MIN_ALLOCATION_OPTIONS = 2;
const MAX_ALLOCATION_OPTIONS = 8;
const MIN_MATCHING_PAIRS = 2;
const MAX_MATCHING_PAIRS = 10;
const MIN_RANKING_ITEMS = 2;
const MAX_RANKING_ITEMS = 8;
const MIN_SCALE_STATEMENTS = 1;
const MAX_SCALE_STATEMENTS = 10;

/** Common shape for the collection-level question hooks. The flat
 *  `schedule` / `commit` / `flush` API still applies for top-level fields
 *  (prompt, scoring, scaleMin, ...); the collection-only ops add bounds-
 *  aware add/remove/update for the nested items. */
interface CollectionElementEditorApi<
  T extends DeckElement,
  Item,
> extends FlatElementEditorApi<T> {
  /** Latest items array, read straight from the deck cache. */
  items: Item[];
  /** False at the max-items bound — bind to your add button's disabled. */
  canAdd: boolean;
  /** False at the min-items bound — bind to each row's remove button. */
  canRemove: boolean;
  /** Append a fresh item (via the kind-specific factory) and commit. */
  addItem: () => void;
  /** Drop the item with this id and commit. No-op below the min bound. */
  removeItem: (id: string) => void;
  /** Patch a single item in place. `mode` defaults to "schedule" (debounced)
   *  for text/value edits; pass "commit" for structural per-item changes
   *  (color, image, etc.). */
  updateItem: (
    id: string,
    patch: Partial<Item>,
    mode?: "schedule" | "commit",
  ) => void;
}

// ── Allocation ────────────────────────────────────────────────────────────

const isAllocationQuestion = (e: DeckElement): e is AllocationQuestion =>
  e.kind === "AllocationQuestion";

/** Editor for `AllocationQuestion`. Reuses the `McqOption` shape for items
 *  (the backend stores Allocation's choices as McqOptions to keep the
 *  schema cheap — same id/text/image/color). */
const useAllocationEditor = (
  delay = 500,
): CollectionElementEditorApi<AllocationQuestion, McqOption> => {
  const base = useFlatElementEditor<AllocationQuestion>(
    isAllocationQuestion,
    delay,
  );
  const items = base.question?.options ?? [];
  const canAdd = items.length < MAX_ALLOCATION_OPTIONS;
  const canRemove = items.length > MIN_ALLOCATION_OPTIONS;

  const addItem = () => {
    if (!base.question || !canAdd) return;
    base.flush();
    base.commit({
      options: [...items, { id: crypto.randomUUID(), text: "" }],
    });
  };

  const removeItem = (id: string) => {
    if (!base.question || !canRemove) return;
    base.flush();
    base.commit({ options: items.filter((o) => o.id !== id) });
  };

  const updateItem = (
    id: string,
    patch: Partial<McqOption>,
    mode: "schedule" | "commit" = "schedule",
  ) => {
    if (!base.question) return;
    const next = items.map((o) => (o.id === id ? { ...o, ...patch } : o));
    (mode === "commit" ? base.commit : base.schedule)({ options: next });
  };

  return { ...base, items, canAdd, canRemove, addItem, removeItem, updateItem };
};

/** Per-option editor for Allocation. Mirrors `useMcqOptionEditor` exactly
 *  (same item shape) but routes commits through the Allocation parent's
 *  cache write. Each instance owns its own debounce timer, so when callers
 *  later extract an `AllocationOptionEditable` component the per-row text
 *  edit feels responsive without sibling rows interfering. */
const useAllocationOptionEditor = (
  optionId: string | undefined,
  delay = 500,
) => {
  const editor = useAllocationEditor(delay);
  const index = optionId
    ? editor.items.findIndex((o) => o.id === optionId)
    : -1;
  const option = index >= 0 ? editor.items[index] : undefined;

  const schedule = (next: McqOption) => {
    if (!optionId) return;
    editor.updateItem(optionId, next, "schedule");
  };

  const commit = (next: McqOption) => {
    if (!optionId) return;
    editor.updateItem(optionId, next, "commit");
  };

  const remove = () => {
    if (!optionId) return;
    editor.removeItem(optionId);
  };

  return {
    option,
    parent: editor.question,
    schedule,
    commit,
    flush: editor.flush,
    index,
    canRemove: editor.canRemove,
    remove,
    syncedFromId: editor.syncedFromId,
    markSynced: editor.markSynced,
  };
};

// ── Matching ──────────────────────────────────────────────────────────────

const isMatchingQuestion = (e: DeckElement): e is MatchingQuestion =>
  e.kind === "MatchingQuestion";

/** Editor for `MatchingQuestion`. Pair items live on `pairs`; the on-screen
 *  order is the answer key — the runtime shuffles the right column at
 *  presentation time, but the cache (and therefore this hook) returns them
 *  in authoring order. */
const useMatchingEditor = (
  delay = 500,
): CollectionElementEditorApi<MatchingQuestion, MatchingPair> => {
  const base = useFlatElementEditor<MatchingQuestion>(
    isMatchingQuestion,
    delay,
  );
  const items = base.question?.pairs ?? [];
  const canAdd = items.length < MAX_MATCHING_PAIRS;
  const canRemove = items.length > MIN_MATCHING_PAIRS;

  const addItem = () => {
    if (!base.question || !canAdd) return;
    base.flush();
    base.commit({
      pairs: [
        ...items,
        { id: crypto.randomUUID(), leftLabel: "", rightLabel: "" },
      ],
    });
  };

  const removeItem = (id: string) => {
    if (!base.question || !canRemove) return;
    base.flush();
    base.commit({ pairs: items.filter((p) => p.id !== id) });
  };

  const updateItem = (
    id: string,
    patch: Partial<MatchingPair>,
    mode: "schedule" | "commit" = "schedule",
  ) => {
    if (!base.question) return;
    const next = items.map((p) => (p.id === id ? { ...p, ...patch } : p));
    (mode === "commit" ? base.commit : base.schedule)({ pairs: next });
  };

  return { ...base, items, canAdd, canRemove, addItem, removeItem, updateItem };
};

/** Per-pair editor for Matching. Same shape as `useMcqOptionEditor` — `pair`,
 *  `parent`, scoped schedule/commit/remove, index, canRemove. */
const useMatchingPairEditor = (pairId: string | undefined, delay = 500) => {
  const editor = useMatchingEditor(delay);
  const index = pairId ? editor.items.findIndex((p) => p.id === pairId) : -1;
  const pair = index >= 0 ? editor.items[index] : undefined;

  const schedule = (next: MatchingPair) => {
    if (!pairId) return;
    editor.updateItem(pairId, next, "schedule");
  };

  const commit = (next: MatchingPair) => {
    if (!pairId) return;
    editor.updateItem(pairId, next, "commit");
  };

  const remove = () => {
    if (!pairId) return;
    editor.removeItem(pairId);
  };

  return {
    pair,
    parent: editor.question,
    schedule,
    commit,
    flush: editor.flush,
    index,
    canRemove: editor.canRemove,
    remove,
    syncedFromId: editor.syncedFromId,
    markSynced: editor.markSynced,
  };
};

// ── Ranking ───────────────────────────────────────────────────────────────

const isRankingQuestion = (e: DeckElement): e is RankingQuestion =>
  e.kind === "RankingQuestion";

/** Editor for `RankingQuestion`. The on-screen order of `items` IS the
 *  correct order — `correctOrder` is kept in lock-step with the item ids
 *  on every write. Drag-to-reorder is follow-up work (see chunk 25 README).
 */
const useRankingEditor = (
  delay = 500,
): CollectionElementEditorApi<RankingQuestion, RankingItem> => {
  const base = useFlatElementEditor<RankingQuestion>(isRankingQuestion, delay);
  const items = base.question?.items ?? [];
  const canAdd = items.length < MAX_RANKING_ITEMS;
  const canRemove = items.length > MIN_RANKING_ITEMS;

  /** Build `correctOrder` from an arbitrary item list. The truthy filter
   *  skips items that haven't been persisted yet (no id) so we never write
   *  `undefined` into the answer key. */
  const correctOrderOf = (rows: RankingItem[]): string[] =>
    rows.map((i) => i.id).filter((id): id is string => id !== undefined);

  const addItem = () => {
    if (!base.question || !canAdd) return;
    base.flush();
    const next = [...items, { id: crypto.randomUUID(), label: "" }];
    base.commit({ items: next, correctOrder: correctOrderOf(next) });
  };

  const removeItem = (id: string) => {
    if (!base.question || !canRemove) return;
    base.flush();
    const next = items.filter((i) => i.id !== id);
    base.commit({ items: next, correctOrder: correctOrderOf(next) });
  };

  const updateItem = (
    id: string,
    patch: Partial<RankingItem>,
    mode: "schedule" | "commit" = "schedule",
  ) => {
    if (!base.question) return;
    const next = items.map((i) => (i.id === id ? { ...i, ...patch } : i));
    // correctOrder doesn't change on label edits — only on structural shifts.
    (mode === "commit" ? base.commit : base.schedule)({ items: next });
  };

  return { ...base, items, canAdd, canRemove, addItem, removeItem, updateItem };
};

/** Per-item editor for Ranking. */
const useRankingItemEditor = (itemId: string | undefined, delay = 500) => {
  const editor = useRankingEditor(delay);
  const index = itemId ? editor.items.findIndex((i) => i.id === itemId) : -1;
  const item = index >= 0 ? editor.items[index] : undefined;

  const schedule = (next: RankingItem) => {
    if (!itemId) return;
    editor.updateItem(itemId, next, "schedule");
  };

  const commit = (next: RankingItem) => {
    if (!itemId) return;
    editor.updateItem(itemId, next, "commit");
  };

  const remove = () => {
    if (!itemId) return;
    editor.removeItem(itemId);
  };

  return {
    item,
    parent: editor.question,
    schedule,
    commit,
    flush: editor.flush,
    index,
    canRemove: editor.canRemove,
    remove,
    syncedFromId: editor.syncedFromId,
    markSynced: editor.markSynced,
  };
};

// ── Scales ────────────────────────────────────────────────────────────────

const isScalesQuestion = (e: DeckElement): e is ScalesQuestion =>
  e.kind === "ScalesQuestion";

/** Editor for `ScalesQuestion`. Top-level fields (scaleMin / scaleMax /
 *  minLabel / maxLabel / scored) ride the flat `schedule({...})` channel;
 *  per-statement edits go through the collection ops. */
const useScalesEditor = (
  delay = 500,
): CollectionElementEditorApi<ScalesQuestion, ScaleStatement> => {
  const base = useFlatElementEditor<ScalesQuestion>(isScalesQuestion, delay);
  const items = base.question?.statements ?? [];
  const canAdd = items.length < MAX_SCALE_STATEMENTS;
  const canRemove = items.length > MIN_SCALE_STATEMENTS;

  const addItem = () => {
    if (!base.question || !canAdd) return;
    base.flush();
    base.commit({
      statements: [...items, { id: crypto.randomUUID(), text: "" }],
    });
  };

  const removeItem = (id: string) => {
    if (!base.question || !canRemove) return;
    base.flush();
    base.commit({ statements: items.filter((s) => s.id !== id) });
  };

  const updateItem = (
    id: string,
    patch: Partial<ScaleStatement>,
    mode: "schedule" | "commit" = "schedule",
  ) => {
    if (!base.question) return;
    const next = items.map((s) => (s.id === id ? { ...s, ...patch } : s));
    (mode === "commit" ? base.commit : base.schedule)({ statements: next });
  };

  return { ...base, items, canAdd, canRemove, addItem, removeItem, updateItem };
};

/** Per-statement editor for Scales. */
const useScalesStatementEditor = (
  statementId: string | undefined,
  delay = 500,
) => {
  const editor = useScalesEditor(delay);
  const index = statementId
    ? editor.items.findIndex((s) => s.id === statementId)
    : -1;
  const statement = index >= 0 ? editor.items[index] : undefined;

  const schedule = (next: ScaleStatement) => {
    if (!statementId) return;
    editor.updateItem(statementId, next, "schedule");
  };

  const commit = (next: ScaleStatement) => {
    if (!statementId) return;
    editor.updateItem(statementId, next, "commit");
  };

  const remove = () => {
    if (!statementId) return;
    editor.removeItem(statementId);
  };

  return {
    statement,
    parent: editor.question,
    schedule,
    commit,
    flush: editor.flush,
    index,
    canRemove: editor.canRemove,
    remove,
    syncedFromId: editor.syncedFromId,
    markSynced: editor.markSynced,
  };
};

// ── Slide (non-interactive screen with a block stack) ─────────────────────

const isSlide = (e: DeckElement): e is Slide => e.kind === "Slide";

/** Hydrate the cached `blocks` (typed `SlideBlock[]` from codegen) into the
 *  typed discriminated union, dropping any blocks whose `kind` we don't
 *  know about. Mirrors the same helper in `SlideContent.tsx` so callers
 *  reading `blocks` from this hook get them already-narrowed. */
const hydrateBlocks = (raw: SlideBlock[] | undefined): SlideBlockUnion[] => {
  if (!raw) return [];
  return raw
    .map(narrowSlideBlock)
    .filter((b): b is SlideBlockUnion => b !== null);
};

/** Migration glue: when the server still returns the legacy `body` string
 *  but has no `blocks`, surface it as a single BodyBlock so the editor
 *  renders consistently. The next commit replaces both fields with the
 *  canonical block list (every patch here passes `body: ""`). */
const initialBlocksFromSlide = (slide: Slide): SlideBlockUnion[] => {
  const fromBlocks = hydrateBlocks(slide.blocks);
  if (fromBlocks.length > 0) return fromBlocks;
  if (slide.body && slide.body.trim().length > 0) {
    return [
      {
        kind: "BodyBlock",
        id: `legacy-body-${slide.id ?? "anon"}`,
        richBody: slide.body,
      },
    ];
  }
  return [];
};

interface SlideEditorApi extends FlatElementEditorApi<Slide> {
  /** Narrowed block list from the cached slide. Already filtered through
   *  `narrowSlideBlock` so callers don't see `kind` strings outside the
   *  known union. */
  blocks: SlideBlockUnion[];
  /** Append a fresh block of the requested kind and commit immediately
   *  (structural ops are never debounced). */
  addBlock: (kind: SlideBlockKind) => void;
  /** Remove a block by id and commit. */
  removeBlock: (id: string) => void;
  /** Swap a block with its neighbour in `direction` (-1 = up, +1 = down).
   *  Silent no-op at the ends. */
  moveBlock: (id: string, direction: -1 | 1) => void;
  /** Replace a single block in place. `mode` defaults to "schedule" for
   *  text/rich-body edits; pass "commit" for structural changes (heading
   *  level, callout tone, image swap). Every patch also clears the legacy
   *  `body` field so the slide is fully migrated once the author touches
   *  the block list. */
  updateBlock: (next: SlideBlockUnion, mode?: "schedule" | "commit") => void;
}

/** Editor for the non-interactive `Slide` kind.
 *
 *  Top-level fields (`title`, `slideKind`, `displaySeconds`,
 *  `audioAssetId`/`audioUrl`, `videoAssetId`/`videoUrl`) ride the flat
 *  `schedule({...})` / `commit({...})` channel. The block-list lives at
 *  `blocks` and is mutated via `addBlock` / `removeBlock` / `moveBlock` /
 *  `updateBlock`.
 *
 *  Every block-list write also stomps the legacy `body` field with `""`
 *  so once the author has touched the block stack we never fall back to
 *  the pre-chunk-10c body string again. */
const useSlideEditor = (delay = 500): SlideEditorApi => {
  const base = useFlatElementEditor<Slide>(isSlide, delay);
  const blocks = base.question ? initialBlocksFromSlide(base.question) : [];

  const commitBlocks = (
    next: SlideBlockUnion[],
    mode: "schedule" | "commit" = "commit",
  ) => {
    const patch: Partial<Slide> = { blocks: next, body: "" };
    (mode === "commit" ? base.commit : base.schedule)(patch);
  };

  const addBlock = (kind: SlideBlockKind) => {
    if (!base.question) return;
    base.flush();
    commitBlocks([...blocks, createSlideBlock(kind)]);
  };

  const removeBlock = (id: string) => {
    if (!base.question) return;
    base.flush();
    commitBlocks(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    if (!base.question) return;
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= blocks.length) return;
    base.flush();
    const next = [...blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    commitBlocks(next);
  };

  const updateBlock = (
    nextBlock: SlideBlockUnion,
    mode: "schedule" | "commit" = "schedule",
  ) => {
    if (!base.question) return;
    const next = blocks.map((b) => (b.id === nextBlock.id ? nextBlock : b));
    commitBlocks(next, mode);
  };

  return { ...base, blocks, addBlock, removeBlock, moveBlock, updateBlock };
};

export {
  useElementEditor,
  useMcqOptionEditor,
  useMcqQuestionEditor,
  MIN_MCQ_OPTIONS,
  MAX_MCQ_OPTIONS,
  // Per-kind hooks (chunk 25)
  useFlatElementEditor,
  useTextQuestionEditor,
  useNumberQuestionEditor,
  useWordCloudEditor,
  useQAndAEditor,
  useDrawingEditor,
  usePlaceOnImageEditor,
  useGridQuestionEditor,
  useAllocationEditor,
  useAllocationOptionEditor,
  useMatchingEditor,
  useMatchingPairEditor,
  useRankingEditor,
  useRankingItemEditor,
  useScalesEditor,
  useScalesStatementEditor,
  useSlideEditor,
  MIN_ALLOCATION_OPTIONS,
  MAX_ALLOCATION_OPTIONS,
  MIN_MATCHING_PAIRS,
  MAX_MATCHING_PAIRS,
  MIN_RANKING_ITEMS,
  MAX_RANKING_ITEMS,
  MIN_SCALE_STATEMENTS,
  MAX_SCALE_STATEMENTS,
};
