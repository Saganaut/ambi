// Chunk 24 — shared "Behavior" section. Mounts for every interactive
// element kind (per `relevanceFor` — Slide is excluded since it has nothing
// to gate). The first behavior knob is `showResponses`, which used to live
// in SlideOptionsSection but now belongs at the kind-agnostic layer because
// the cascade (element > deck > session > format-default) only works if
// every kind can override it.
//
// The dropdown shows the resolved-default as helper text under INHERIT so
// authors can see what the live session would do without flipping it
// explicitly. The deck-level default lives in ThemePanel; this section only
// reads it (via the same useGetDeckQuery cache) to compute that helper.
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { RadioGroup } from "@/components/Common/Input/RadioGroup/RadioGroup";
import { useGetDeckQuery, type DeckResponse } from "@/store/BrainFlexApi";
import {
  formatDefaultShowResponses,
  resolveShowResponses,
  type ShowResponsesMode,
} from "@/utils/showResponsesResolver";
import { useElementEditor } from "../../SlideContentTypes/useElementEditor";
import { relevanceFor } from "../data";
import styles from "../EditSlidePanel.module.css";

type DeckElement = NonNullable<DeckResponse["elements"]>[number];

const routeApi = getRouteApi("/decks/$deckId/edit");

// Tautology predicate; lets useElementEditor narrow the union to the same
// union (every kind shares showResponses). The cast on the way out keeps
// the discriminant.
const anyElement = (e: DeckElement): e is DeckElement => Boolean(e);

const SHOW_RESPONSES_OPTIONS: { value: ShowResponsesMode; label: string }[] = [
  { value: "INHERIT", label: "Inherit" },
  { value: "INSTANT", label: "Instant" },
  { value: "ON_CLICK", label: "On click" },
  { value: "PRIVATE", label: "Private" },
];

const BehaviorSection = () => {
  const { deckId } = routeApi.useParams();
  const { data: deck } = useGetDeckQuery({ id: deckId });
  const { element, commit, syncedFromId, markSynced } =
    useElementEditor<DeckElement>(anyElement);

  // Chunk 25 — showResponses stays a Slide-only record component (the other
  // kinds inherit the interface default INHERIT). Narrow to Slide for the
  // read; non-Slide kinds get an undefined initial and the section
  // suppresses itself via the relevance check below.
  const slideShowResponses =
    element?.kind === "Slide" ? element.showResponses : undefined;
  const initial = slideShowResponses ?? "INHERIT";
  const [showResponses, setShowResponses] =
    useState<ShowResponsesMode>(initial);

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
    setShowResponses(slideShowResponses ?? "INHERIT");
  }

  if (!element) return null;

  // Only render for kinds whose relevance map allows showResponses (the
  // Slide kind suppresses it — non-interactive content has nothing to gate).
  // `slideKind` only narrows on the Slide member of the union; for other
  // kinds the field is undefined and relevanceFor doesn't read it.
  const slideKind = element.kind === "Slide" ? element.slideKind : undefined;
  const rel = relevanceFor({ kind: element.kind, slideKind });
  if (!rel.showResponses) return null;

  // Walk the cascade with no session in play; falls through to the deck's
  // defaultShowResponses, then the format-default for the deck's
  // defaultSessionFormat. The author sees the value the live session would
  // resolve to when this element's showResponses is INHERIT.
  const resolvedFallback = resolveShowResponses({
    format: deck?.defaultSessionFormat ?? "GAME",
    sessionShowResponses: undefined,
    deckShowResponses: deck?.defaultShowResponses,
    elementShowResponses: "INHERIT",
  });

  const elId = element.id ?? "";

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Behavior</h4>
      <RadioGroup
        name={`behavior-show-responses-${elId}`}
        legend='Show responses'
        options={SHOW_RESPONSES_OPTIONS}
        value={showResponses}
        onChange={(value) => {
          const next = value as ShowResponsesMode;
          setShowResponses(next);
          if (element.kind === "Slide") {
            commit({ ...element, showResponses: next });
          }
        }}
      />
      {showResponses === "INHERIT" && (
        <p className={styles.behaviorHint}>
          Inheriting <strong>{resolvedFallback}</strong>{" "}
          {deck?.defaultShowResponses && deck.defaultShowResponses !== "INHERIT"
            ? "from this deck"
            : `(${deck?.defaultSessionFormat ?? "GAME"} default)`}
        </p>
      )}
      {/* Cross-check that the deck-level format-default we display matches
          what the live resolver would compute. Cheap belt-and-suspenders. */}
      {showResponses === "INHERIT" &&
        deck?.defaultSessionFormat &&
        resolvedFallback !==
          formatDefaultShowResponses(deck.defaultSessionFormat) &&
        deck.defaultShowResponses === "INHERIT" && (
          <p className={styles.behaviorHint}>
            (Resolver disagreement — please report.)
          </p>
        )}
    </section>
  );
};

export { BehaviorSection };
