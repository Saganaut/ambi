/**
 * Top-level layout for the deck editor at /decks/$deckId/view.
 *
 * Owns the three-column canvas (slide rail | active slide | inspector) and the
 * editor navbar. The navbar's title is an inline-editable input that patches the
 * deck name through `PUT /api/decks/{id}` on blur/Enter — no save button.
 */
import { getRouteApi, useNavigate } from "@tanstack/react-router";

import { LeftSidebarContent } from "../../components/DeckEditor/LeftSidebar/LeftSidebarContent";
import { PublishStatusControl } from "../../components/DeckEditor/PublicStatusControl/PublishStatusControl";
import { RightSidebarContent } from "../../components/DeckEditor/RightSidebar/RightSidebarContent";
import { SlideDisplay } from "../../components/DeckEditor/SlideDisplay/SlideDisplay";

import { SpeakerNotesDrawer } from "../../components/DeckEditor/SpeakerNotesDrawer/SpeakerNotesDrawer";
import styles from "./DeckEditor.module.css";

import { ArrowsPointingOutIcon, PlayIcon, ShareIcon } from "@heroicons/react/24/outline";

import { deckValidation } from "@/features/deck/store/deckValidationConstants";
import { Input } from "@/shared/components/Forms/Input/Input/Input";
import { Dashboard } from "@/shared/components/Layout/Dashboard/Dashboard";
import { useFullScreen } from "@/shared/hooks/useFullScreen";

import { Btn, DropdownMenu, SplitBtn } from "@saganaut/ambi-ui";
import { SidePanelDrawer } from "../../components/DeckEditor/RightSidebar/SidePanelDrawer/SidePanelDrawer";
import { ImageSlotProvider } from "../../contexts/ImageSlotContext";
import { ResultsPreviewProvider } from "../../contexts/ResultsPreviewContext";
import { useDeckEditor } from "../../hooks/useDeckEditor";
import { EditorSkeleton } from "./EditorSkeleton";
const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const DeckEditor = () => {
  const navigate = useNavigate();
  const { toggleFullScreen } = useFullScreen();
  const { deckId } = routeApi.useParams();
  const {
    isLoading,
    serverName,
    titleDraft,
    setTitleDraft,
    commitTitle,
    isStarting,
    startError,
    present,
    share,
    schedule,
    preview,
  } = useDeckEditor(deckId);

  // First load only: show the matching three-column placeholder instead of an
  // empty shell so the editor doesn't flash blank then paint everything at once.
  if (isLoading) return <EditorSkeleton />;

  return (
    <Dashboard className={styles.deckEditor}>
      <Dashboard.Header>
        <div className={styles.navbar}>
          <div className={styles.leftControlButtons}>
            <Btn
              size={"md"}
              shape={"pill"}
              onClick={() => {
                void navigate({
                  to: "/decks",
                });
              }}
            >
              Back
            </Btn>
            <Btn
              shape={"pill"}
              size={"sm"}
              aria-label="Enter fullscreen"
              onClick={toggleFullScreen}
              icon={<ArrowsPointingOutIcon className={styles.iconMd} />}
            />{" "}
            <Input
              withPadding={false}
              ariaLabel="Deck title"
              value={titleDraft}
              placeholder="Untitled Deck"
              className={styles.titleDeck}
              maxLength={deckValidation.UpdateDeckRequest.name.maxLength}
              onChange={(e) => {
                setTitleDraft(e.target.value);
              }}
              isBordered={false}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setTitleDraft(serverName);
                  e.currentTarget.blur();
                }
              }}
            />
          </div>

          <div className={styles.rightControlButtons}>
            <PublishStatusControl />

            <Btn
              size={"md"}
              shape={"pill"}
              onClick={share}
              icon={<ShareIcon className={styles.iconMd} />}
            >
              Share
            </Btn>
            <SplitBtn
              size={"md"}
              shape={"pill"}
              variant={"brand"}
              disabled={isStarting}
              aria-describedby={startError ? "start-interactiveSession-error" : undefined}
              onClick={() => {
                void present();
              }}
              menuAriaLabel="More start options"
              menuItems={
                <>
                  <DropdownMenu.Item onClick={preview}>Preview</DropdownMenu.Item>
                  <DropdownMenu.Item onClick={schedule}>Schedule</DropdownMenu.Item>
                </>
              }
            >
              <PlayIcon className={styles.iconMd} />
              {isStarting ? "Starting…" : "Start"}
            </SplitBtn>
            {startError && (
              <span id="start-interactiveSession-error" className={styles.startError} role="alert">
                {startError}
              </span>
            )}
          </div>
        </div>
      </Dashboard.Header>

      <Dashboard.Body>
        <ImageSlotProvider>
          <ResultsPreviewProvider>
            <LeftSidebarContent />
            <Dashboard.Canvas className={styles.slideCanvasContainer}>
              <SlideDisplay />
              <SpeakerNotesDrawer />
            </Dashboard.Canvas>
            <SidePanelDrawer />

            <RightSidebarContent />
          </ResultsPreviewProvider>
        </ImageSlotProvider>
      </Dashboard.Body>
    </Dashboard>
  );
};

export { DeckEditor };
