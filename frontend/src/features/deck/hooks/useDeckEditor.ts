// Central state hook for the deck editor at /decks/$deckId/edit.
//
// Composes the two intent-level layers — `useDeck` (single deck + lifecycle
// mutations) and `useSlide` (the slide collection + add/update/remove/reorder)
// — with the route's params/search and the navbar's local title-draft state,
// and hands the whole editor surface a single object to render from. Every
// consumer (navbar, left rail, canvas, inspector) calls `useDeckEditor()`
// directly; they all read the same RTK Query caches under the hood, so there's
// no shared provider to thread — the cache is the single source of truth.
//
// ─── TODO: gaps in the generated AmbiApi this hook papers over ──────────────
// The following are stubbed (return constants / no-op + console) because the
// backend endpoints or schema fields don't exist yet. Wire them up once the
// corresponding API lands and is regenerated into `AmbiApi.ts`:
//
//  • Analytics: no analytics endpoints are generated. `canViewAnalytics` is
//    derived from `deck.permissions.canEdit` as a best guess. The backend also
//    gates analytics on non-system decks — there's no `isSystem` flag on
//    DeckResponse to honour that half of the rule yet.
//  • Share: `useDeck.share/revokeShare` exist, but there's no user-search
//    endpoint or share modal, so `share` is a stub.
//  • Schedule: no scheduling endpoint — `schedule` is a stub.
//  • Preview: no read-only deck-renderer route — `preview` is a stub.
//  • Speaker notes: neither SlideRequest nor SlideResponse carries a notes
//    field, so the SpeakerNotesDrawer has nothing to bind to yet.
// ────────────────────────────────────────────────────────────────────────────

import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";

import type { DeckResponse, SlideResponse } from "@deck/store/deckApi.gen";
import type { FollowUpMode } from "@deck/store/deckEnums.gen";
import { followUpModesFor, groupIntoUnits } from "../utils/followUp";

import { useLiveSession } from "@/features/liveSession/hooks/useLiveSession";
import { useDeckMutate } from "./useDeckMutate";
import { useDeckQuery } from "./useDeckQuery";
import { useSlide, type AddSlideOptions } from "./useSlide";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

interface UseDeckEditorResult {
  /** The deck being edited (undefined while the initial fetch is in flight). */
  deck: DeckResponse | undefined;
  deckId: string;
  isLoading: boolean;
  error: unknown;

  /** ── Title (navbar inline-edit) ──────────────────────────────────────── */
  /** The persisted deck name; the draft falls back / resets to this. */
  serverName: string;
  /** The in-flight title input value (local; not yet persisted). */
  titleDraft: string;
  setTitleDraft: (value: string) => void;
  /** Persist the draft on blur/Enter; no-ops on empty or unchanged. */
  commitTitle: () => void;

  /** ── Slides (left rail + canvas) ─────────────────────────────────────── */
  slides: SlideResponse[];
  /** The slide the route's `slideId` points at, if any. */
  selectedSlide: SlideResponse | undefined;
  selectedSlideId: string | undefined;
  /** Point the editor at a slide by updating the route's `slideId`. */
  selectSlide: (slideId: string) => void;
  /** Append a slide, select it, and scroll its thumbnail into view. */
  addSlide: (options?: AddSlideOptions) => void;
  /**
   * Attach a follow-up slide directly after a scorable parent, select it, and
   * scroll it into view. Defaults to the first mode valid for the parent's
   * content type (the inspector can change it after); no-ops if none is.
   */
  addFollowUp: (parentSlideId: string, mode?: FollowUpMode) => void;
  removeSlide: (slideId: string) => void;
  /** Move a slide to a new zero-based position (drag-and-drop in the rail). */
  reorder: (slideId: string, toIndex: number) => void;
  /**
   * @dnd-kit drop handler for the left rail's <DragDropProvider>. Translates the
   * sortable drag into a {@link reorder} call.
   */
  handleDragEnd: (event: DragEndEvent) => void;

  /** ── Navbar actions ──────────────────────────────────────────────────── */
  canEdit: boolean;
  /** See TODO header — derived from `canEdit`, missing the system-deck rule. */
  canViewAnalytics: boolean;
  /** Live-session "Start": host the deck as a live session and open its page. */
  present: () => void;
  /** True while the create-session request behind `present` is in flight. */
  isStarting: boolean;
  /** A user-readable message if the last `present` failed, else null. */
  startError: string | null;
  share: () => void;
  schedule: () => void;
  preview: () => void;
}

/** Scroll the newly-added thumbnail into view; runs after the route commits. */
const scrollThumbnailIntoView = (slideId: string) => {
  // Defer one frame so the new thumbnail has mounted with its HTML id.
  requestAnimationFrame(() => {
    document.getElementById(slideId)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  });
};

const useDeckEditor = (deckId: string, slideId?: string): UseDeckEditorResult => {
  const navigate = routeApi.useNavigate();

  const { deck, isLoading: deckLoading, error } = useDeckQuery(deckId);
  const { rename } = useDeckMutate(deckId);
  const { present: livePresent, isStarting, startError } = useLiveSession();
  const {
    slides,
    isLoading: slidesLoading,
    addSlide: appendSlide,
    addFollowUp: attachFollowUp,
    removeSlide,
    reorder,
  } = useSlide(deckId);

  // Initial load only (RTK `isLoading`, not `isFetching`) — true until the first
  // deck + slides reads resolve, so the editor shows a skeleton instead of an
  // empty shell. Background refetches keep the last data on screen.
  const isLoading = deckLoading || slidesLoading;

  // ── Title draft ──────────────────────────────────────────────────────────
  // Mirror the server name into local state, re-syncing whenever the server
  // value changes (e.g. another client renames the deck). Deriving the reset
  // during render — rather than in an effect — keeps the input in step without
  // a flash of stale text.
  const serverName = deck?.name ?? "";
  const [draft, setDraft] = useState<{ value: string; syncedFrom: string }>({
    value: serverName,
    syncedFrom: serverName,
  });
  if (draft.syncedFrom !== serverName) {
    setDraft({ value: serverName, syncedFrom: serverName });
  }
  const titleDraft = draft.value;

  const setTitleDraft = (value: string) => {
    setDraft({ value, syncedFrom: serverName });
  };

  const commitTitle = () => {
    const next = titleDraft.trim();
    if (!next || next === serverName) {
      // Reset the draft to the server value so a blanked/unchanged input
      // snaps back instead of persisting an empty name.
      setTitleDraft(serverName);
      return;
    }
    rename(next);
  };

  // ── Slide selection / creation ─────────────────────────────────────────────
  const selectedSlideId = slideId;
  const selectedSlide = slides.find((slide) => slide.id === selectedSlideId);

  const selectSlide = (slideId: string) => {
    void navigate({ search: (prev) => ({ ...prev, slideId: slideId }) });
  };

  const addSlide = (options?: AddSlideOptions) => {
    const newId = appendSlide(options);
    selectSlide(newId);
    scrollThumbnailIntoView(newId);
  };

  const addFollowUp = (parentSlideId: string, mode?: FollowUpMode) => {
    const parent = slides.find((slide) => slide.id === parentSlideId);
    if (!parent) return;
    const resolvedMode =
      mode ?? followUpModesFor(parent.content.contentType)[0];
    if (!resolvedMode) return;
    const newId = attachFollowUp(parentSlideId, resolvedMode);
    selectSlide(newId);
    scrollThumbnailIntoView(newId);
  };

  // ── Drag-to-reorder (left rail) ────────────────────────────────────────────
  // @dnd-kit hands us the source draggable carrying its starting (`initialIndex`)
  // and final (`index`) positions; its `id` is the slide id we registered via
  // useSortable. The rail registers one sortable per *unit* (a parent and its
  // attached follow-up drag as a single block), so the sortable index counts
  // units while the wire contract counts slides — convert by summing the sizes
  // of the units that land before the destination, excluding the moved one.
  // The optimistic cache patch lives in the slide enhancement, so this stays a
  // thin adapter. Bail on canceled drags and no-op drops so we don't fire a
  // redundant move.
  const handleDragEnd = (event: DragEndEvent) => {
    if (event.canceled) return;
    const { source } = event.operation;
    if (!isSortable(source)) return;
    const { initialIndex, index, id } = source;
    if (initialIndex === index) return;
    const otherUnits = groupIntoUnits(slides).filter(
      (unit) => unit.head.id !== String(id),
    );
    const flatIndex = otherUnits
      .slice(0, index)
      .reduce((count, unit) => count + (unit.followUp ? 2 : 1), 0);
    reorder(String(id), flatIndex);
  };

  // ── Navbar ─────────────────────────────────────────────────────────────────
  const canEdit = deck?.permissions.canEdit ?? false;
  const canViewAnalytics = canEdit;

  const present = () => {
    // Live-session "Start": create the session and navigate to it. The in-flight
    // and failure state is surfaced as `isStarting` / `startError` (below) by
    // `useLiveSession`, so this handler just fires the flow.
    void livePresent(deckId);
  };

  const share = () => {
    console.log("share not implemented yet");
  };

  const schedule = () => {
    console.log("schedule not implemented yet");
  };

  const preview = () => {
    console.log("preview not implemented yet");
  };

  return {
    deck,
    deckId,
    isLoading,
    error,

    serverName,
    titleDraft,
    setTitleDraft,
    commitTitle,

    slides,
    selectedSlide,
    selectedSlideId,
    selectSlide,
    addSlide,
    addFollowUp,
    removeSlide,
    reorder,
    handleDragEnd,

    canEdit,
    canViewAnalytics,
    present,
    isStarting,
    startError,
    share,
    schedule,
    preview,
  };
};

export { useDeckEditor };
export type { UseDeckEditorResult };
