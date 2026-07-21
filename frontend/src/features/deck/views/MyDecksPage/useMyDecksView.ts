// View-model for the My Decks page: owns the deck-list query plus the
// client-side search and publish-status tab filtering the page renders.
// Filtering stays client-side because the list endpoint already returns every
// deck the user owns; move it server-side only if that stops being true.
import { useMemo, useState } from "react";

import { useListMyDecksQuery, DeckResponse } from "@deck/store/deckApi.gen";
import { type PublishStatus } from "@deck/store/deckEnums.gen";
import { IMAGE_QUERY_REFRESH } from "@/shared/store/imageRefreshPolicy.ts";

const STATUS_FILTERS = ["all", "published", "drafts", "archived"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const FILTER_STATUS: Record<Exclude<StatusFilter, "all">, PublishStatus> = {
  published: "PUBLISHED",
  drafts: "DRAFT",
  archived: "ARCHIVED",
};

const matchesSearch = (deck: DeckResponse, needle: string): boolean => {
  const haystack = [deck.name, deck.description ?? "", ...deck.tags]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
};

interface UseMyDecksViewResult {
  /** Decks matching the current search, keyed by status filter. */
  decksByFilter: Record<StatusFilter, DeckResponse[]>;
  /** Tab counts for the current search. */
  countsByFilter: Record<StatusFilter, number>;
  /** Total number of owned decks (unfiltered). */
  deckCount: number;
  /** Most recent `updatedAt` across all owned decks, if any exist. */
  lastEditedAt?: string;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (filter: StatusFilter) => void;
  isLoading: boolean;
  error: unknown;
}

const useMyDecksView = (): UseMyDecksViewResult => {
  // Deck cards render presigned cover-image URLs; keep them fresh so a
  // long-open dashboard never shows an expired URL. See imageRefreshPolicy.
  const {
    data: myDecks,
    isLoading,
    error,
  } = useListMyDecksQuery(undefined, IMAGE_QUERY_REFRESH);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const decks = useMemo(() => myDecks ?? [], [myDecks]);

  const decksByFilter = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const searched =
      needle === "" ? decks : decks.filter((d) => matchesSearch(d, needle));
    return {
      all: searched,
      published: searched.filter(
        (d) => d.publishStatus === FILTER_STATUS.published,
      ),
      drafts: searched.filter((d) => d.publishStatus === FILTER_STATUS.drafts),
      archived: searched.filter(
        (d) => d.publishStatus === FILTER_STATUS.archived,
      ),
    };
  }, [decks, search]);

  const countsByFilter = {
    all: decksByFilter.all.length,
    published: decksByFilter.published.length,
    drafts: decksByFilter.drafts.length,
    archived: decksByFilter.archived.length,
  };

  const lastEditedAt = useMemo(() => {
    if (decks.length === 0) return undefined;
    return decks.reduce((latest, d) =>
      d.updatedAt > latest.updatedAt ? d : latest,
    ).updatedAt;
  }, [decks]);

  return {
    decksByFilter,
    countsByFilter,
    deckCount: decks.length,
    lastEditedAt,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    isLoading,
    error,
  };
};

export { useMyDecksView, STATUS_FILTERS };
export type { StatusFilter, UseMyDecksViewResult };
