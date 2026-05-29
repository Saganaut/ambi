// Cross-cutting inspector section for any DeckElement. Every element kind
// carries the chunk-10b shared metadata (mediaCaption / altText for the
// audience screen reader), so this section mounts regardless of kind. The
// per-slide emoji-reactions opt-out lives in the Participants panel; tags
// live in the Tags (DeckCategorize) panel; provenance is rendered as a
// footer outside of here.
//
// Chunk 25 — mediaCaption / altText / version / lastEditedByUserId all live
// inside `chrome` now, so the patch shape embeds them under `chrome:` rather
// than at the top level.
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Input } from "@/components/Common/Input/Input/Input";
import { useDebouncedCommit } from "@/hooks/useDebouncedCommit";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  useGetDeckQuery,
  useUpdateElementMutation,
  type DeckResponse,
} from "@/store/AmbiApi";
import styles from "../EditSlidePanel.module.css";

type DeckElement = NonNullable<DeckResponse["elements"]>[number];

const routeApi = getRouteApi("/decks/$deckId/edit");

const CommonOptionsSection = () => {
  const { deckId } = routeApi.useParams();
  const { questionId } = routeApi.useSearch();
  const currentUser = useCurrentUser();
  const currentUserId =
    currentUser.state === "registered" || currentUser.state === "guest"
      ? currentUser.user.id
      : undefined;

  const { element } = useGetDeckQuery(
    { id: deckId },
    {
      selectFromResult: ({ data }) => ({
        element: data?.elements?.find((e) => e.id === questionId),
      }),
    },
  );

  const [updateElement] = useUpdateElementMutation();

  const commit = (patch: DeckElement) => {
    if (!element?.id) return;
    const stamped: DeckElement = {
      ...patch,
      chrome: {
        ...(patch.chrome ?? {}),
        lastEditedByUserId: currentUserId,
        version: (patch.chrome?.version ?? 0) + 1,
      },
    };
    void updateElement({
      id: deckId,
      elementId: element.id,
      body: stamped,
    })
      .unwrap()
      .catch((err: unknown) => {
        console.error("Failed to update common element fields", err);
      });
  };

  const { schedule, flush } = useDebouncedCommit<DeckElement>(commit, 500);

  const [mediaCaption, setMediaCaption] = useState<string>(
    element?.chrome?.mediaCaption ?? "",
  );
  const [altText, setAltText] = useState<string>(
    element?.chrome?.altText ?? "",
  );

  const [syncedFromId, setSyncedFromId] = useState<string | undefined>(
    element?.id,
  );

  if (element && syncedFromId !== element.id) {
    setSyncedFromId(element.id);
    setMediaCaption(element.chrome?.mediaCaption ?? "");
    setAltText(element.chrome?.altText ?? "");
  }

  if (!element) return null;

  const buildPatch = (
    chromeOverrides: Partial<NonNullable<DeckElement["chrome"]>>,
  ): DeckElement => ({
    ...element,
    chrome: {
      ...element.chrome,
      mediaCaption,
      altText,
      ...chromeOverrides,
    },
  });

  const elId = element.id ?? "";

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Accessibility &amp; audience</h4>
      <Input
        id={`common-media-caption-${elId}`}
        label='Media caption'
        type='text'
        value={mediaCaption}
        placeholder='Caption shown under image/video…'
        onChange={(e) => {
          const next = e.target.value;
          setMediaCaption(next);
          schedule(buildPatch({ mediaCaption: next }));
        }}
        onBlur={flush}
      />
      <Input
        id={`common-alt-text-${elId}`}
        label='Image alt text'
        value={altText}
        placeholder='Described for screen readers…'
        onChange={(e) => {
          const next = e.target.value;
          setAltText(next);
          schedule(buildPatch({ altText: next }));
        }}
        onBlur={flush}
      />
    </section>
  );
};

export { CommonOptionsSection };
