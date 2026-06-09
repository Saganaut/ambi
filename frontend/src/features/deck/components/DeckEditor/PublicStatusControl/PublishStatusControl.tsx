// Publish/Unpublish/Republish button + status pill for the deck editor
// navbar. Pulls publishStatus from the cached deck (cache-sync in
// apiEnhancements keeps the pill fresh after any of the lifecycle
// mutations resolve) and dispatches the matching mutation on click.
import { getRouteApi } from "@tanstack/react-router";
import { useGetDeckQuery } from "@deck/store/deckApi.gen";
import { type PublishStatus } from "@deck/store/deckEnums.gen";
import { Btn } from "@ui/Buttons/Btn";
import { Badge } from "@ui/Badge/Badge";
import { DropdownMenu, DropdownMenuItem } from "@components/Menus/DropdownMenu";
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
} as const satisfies Record<PublishStatus, string>;

const PublishStatusControl = () => {
  const { deckId } = routeApi.useParams();
  const { data: deck } = useGetDeckQuery({ id: deckId });
  // const [publishDeck, publishState] = usePublishDeckMutation();
  // const [unpublishDeck, unpublishState] = useUnpublishDeckMutation();
  // const [archiveDeck, archiveState] = useArchiveDeckMutation();

  // // Default to DRAFT so the button renders something useful while the deck
  // // is loading or for legacy decks that pre-date publishStatus.
  // const status = deck?.publishStatus ?? "DRAFT";
  // const busy =
  //   publishState.isLoading ||
  //   unpublishState.isLoading ||
  //   archiveState.isLoading;

  // const handlePublish = () => {
  //   void publishDeck({ id: deckId })
  //     .unwrap()
  //     .catch((err: unknown) => {
  //       console.error("Failed to publish deck", err);
  //     });
  // };
  // const handleUnpublish = () => {
  //   void unpublishDeck({ id: deckId })
  //     .unwrap()
  //     .catch((err: unknown) => {
  //       console.error("Failed to unpublish deck", err);
  //     });
  // };
  // const handleArchive = () => {
  //   void archiveDeck({ id: deckId })
  //     .unwrap()
  //     .catch((err: unknown) => {
  //       console.error("Failed to archive deck", err);
  //     });
  // };

  return (
    <div className={styles.control}>
      TO FIX
      {/* <Badge
        variant={STATUS_BADGE_VARIANT[status]}
        label={STATUS_LABEL[status]}
      />

      <DropdownMenu
        position='top-right'
        trigger={(toggle) => (
          <Btn
            size='md'
            shape='pill'
            variant='primary'
            disabled={busy}
            onClick={() => {
              toggle();
            }}>
            ⋯
          </Btn>
        )}>
        <DropdownMenuItem onClick={handleArchive}>
          Archive deck
        </DropdownMenuItem>
        {status === "DRAFT" && (
          <DropdownMenuItem onClick={handlePublish}>Publish</DropdownMenuItem>
        )}
        {status === "PUBLISHED" && (
          <DropdownMenuItem onClick={handleUnpublish}>
            Unpublish
          </DropdownMenuItem>
        )}
      </DropdownMenu>
      {status === "ARCHIVED" && (
        <Btn size='md' shape='pill' disabled={busy} onClick={handlePublish}>
          Republish
        </Btn>
      )} */}
    </div>
  );
};

export { PublishStatusControl };
