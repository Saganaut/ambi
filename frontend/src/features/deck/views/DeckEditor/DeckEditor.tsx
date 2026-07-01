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
import { CanvasBody } from "@/shared/components/Layout/CanvasBody";
import { CanvasHeader } from "@/shared/components/Layout/CanvasHeader";
import { InnerDisplay } from "@/shared/components/Layout/InnerDisplay";
import { MainBodyDashboard } from "@/shared/components/Layout/MainBodyDashboard";
import { DropdownMenuItem } from "@/shared/components/Menus/DropdownMenu";
import { useFullScreen } from "@/shared/hooks/useFullScreen";

import { Btn } from "@ui/Buttons/Btn";
import { SplitBtn } from "@ui/Buttons/SplitBtn/SplitBtn";
import { SidePanelDrawer } from "../../components/DeckEditor/RightSidebar/SidePanelDrawer/SidePanelDrawer";
import { EditorSkeleton } from "./EditorSkeleton";
import { ImageSlotProvider } from "../../contexts/ImageSlotContext";
import { ResultsPreviewProvider } from "../../contexts/ResultsPreviewContext";
import { useDeckEditor } from "../../hooks/useDeckEditor";
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
    <MainBodyDashboard className={styles.deckEditor}>
      <CanvasHeader>
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
              size={"md"}
              aria-label="Enter fullscreen"
              onClick={toggleFullScreen}
            >
              <ArrowsPointingOutIcon className={styles.iconMd} />
            </Btn>{" "}
            <Input
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

            <Btn size={"md"} shape={"pill"} onClick={share}>
              <ShareIcon className={styles.iconMd} />
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
                  <DropdownMenuItem onClick={preview}>Preview</DropdownMenuItem>
                  <DropdownMenuItem onClick={schedule}>Schedule</DropdownMenuItem>
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
      </CanvasHeader>

      <CanvasBody>
        <ImageSlotProvider>
          <ResultsPreviewProvider>
            <LeftSidebarContent />
            <InnerDisplay className={styles.slideCanvasContainer}>
              <SlideDisplay />
              <SpeakerNotesDrawer />
            </InnerDisplay>
            <SidePanelDrawer />

            <RightSidebarContent />
          </ResultsPreviewProvider>
        </ImageSlotProvider>
      </CanvasBody>
    </MainBodyDashboard>
  );
};

export { DeckEditor };
