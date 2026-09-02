// Publish/Unpublish/Republish button + status pill for the deck editor
// navbar. Reads publishStatus from the cached deck (the updateDeck cache-sync in
// store/enhancements/deck.ts keeps the pill fresh) and drives the lifecycle
// through PATCH /api/decks/{id} via useDeckMutate.
import { getRouteApi } from "@tanstack/react-router";

import { useDeckMutate } from "@deck/hooks/useDeckMutate";
import { useDeckQuery } from "@deck/hooks/useDeckQuery";
import { type PublishStatus } from "@deck/store/deckEnums.gen";
import { Btn, DropdownMenu } from "@saganaut/ambi-ui";
import { Badge } from "@ui/Badge/Badge";
import { type BtnVariant } from "@ui/Buttons/Btn.types";
import styles from "./PublishStatusControl.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const STATUS_LABEL = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
} as const satisfies Record<PublishStatus, string>;

const STATUS_BADGE_VARIANT = {
  DRAFT: "info",
  PUBLISHED: "success",
  ARCHIVED: "warning",
} as const satisfies Record<PublishStatus, BtnVariant>;

const PublishStatusControl = () => {
  const { deckId } = routeApi.useParams();
  const { deck } = useDeckQuery(deckId);
  const { updateDeck } = useDeckMutate(deckId);

  // Default to DRAFT so the pill renders something useful while the deck is
  // loading or for legacy decks that pre-date publishStatus.
  const status = deck?.publishStatus ?? "DRAFT";

  // updateDeck merges this partial over the deck's current metadata, so swapping
  // publishStatus leaves the rest of the metadata untouched.
  const setStatus = (publishStatus: PublishStatus) => {
    if (!deck) return;
    updateDeck({ publishStatus });
  };

  return (
    <div className={styles.control}>
      <Badge variant={STATUS_BADGE_VARIANT[status]} label={STATUS_LABEL[status]} />

      <DropdownMenu
        position="top-right"
        trigger={(toggle) => (
          <Btn
            size="md"
            shape="pill"
            variant="primary"
            isDisabled={!deck}
            onClick={() => {
              toggle();
            }}
          >
            ⋯
          </Btn>
        )}
      >
        <DropdownMenu.Item
          onClick={() => {
            setStatus("ARCHIVED");
          }}
        >
          Archive deck
        </DropdownMenu.Item>
        {status === "DRAFT" && (
          <DropdownMenu.Item
            onClick={() => {
              setStatus("PUBLISHED");
            }}
          >
            Publish
          </DropdownMenu.Item>
        )}
        {status === "PUBLISHED" && (
          <DropdownMenu.Item
            onClick={() => {
              setStatus("DRAFT");
            }}
          >
            Unpublish
          </DropdownMenu.Item>
        )}
      </DropdownMenu>

      {status === "ARCHIVED" && (
        <Btn
          size="md"
          shape="pill"
          isDisabled={!deck}
          onClick={() => {
            setStatus("PUBLISHED");
          }}
        >
          Republish
        </Btn>
      )}
    </div>
  );
};

export { PublishStatusControl };
