/**
 * Top-level layout for the deck editor at /decks/$deckId/view.
 *
 * Owns the three-column canvas (slide rail | active slide | inspector) and the
 * editor navbar. The navbar's title is an inline-editable input that patches the
 * deck name through `PUT /api/decks/{id}` on blur/Enter — no save button.
 */
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";

import { LeftSidebarContent } from "../../components/DeckEditor/LeftSidebar/LeftSidebarContent";
import { PublishStatusControl } from "../../components/DeckEditor/PublicStatusControl/PublishStatusControl";
import { RightSidebarContent } from "../../components/DeckEditor/RightSidebar/RightSidebarContent";
import { SlideDisplay } from "../../components/DeckEditor/SlideDisplay/SlideDisplay";
import { SpeakerNotesDrawer } from "../../components/DeckEditor/SpeakerNotesDrawer/SpeakerNotesDrawer";
import styles from "./DeckEditor.module.css";

import {
  ArrowsPointingOutIcon,
  ChartBarIcon,
  PlayIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";

import { DropdownMenuItem } from "@/shared/components/Menus/DropdownMenu";
import { useFullScreen } from "@/shared/hooks/useFullScreen";
import { CanvasBody } from "@/shared/components/Layout/CanvasBody";
import { CanvasHeader } from "@/shared/components/Layout/CanvasHeader";
import { InnerDisplay } from "@/shared/components/Layout/InnerDisplay";
import { MainBodyDashboard } from "@/shared/components/Layout/MainBodyDashboard";
import { Input } from "@/shared/components/Forms/Input/Input/Input";

import { useDeckEditor } from "../../hooks/useDeckEditor";
import { Btn } from "@ui/Buttons/Btn";
import { SplitBtn } from "@ui/Buttons/SplitBtn/SplitBtn";
const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const DeckEditor = () => {
  const navigate = useNavigate();
  const { toggleFullScreen } = useFullScreen();
  const { deckId } = routeApi.useParams();
  const {
    serverName,
    titleDraft,
    setTitleDraft,
    commitTitle,
    canViewAnalytics,
    isStarting,
    startError,
    quickStart,
    handleShareClick,
    handleScheduleClick,
    handlePreview,
  } = useDeckEditor(deckId);

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
              }}>
              Back
            </Btn>
            <Btn
              shape={"pill"}
              size={"md"}
              aria-label='Enter fullscreen'
              onClick={toggleFullScreen}>
              <ArrowsPointingOutIcon className={styles.iconMd} />
            </Btn>{" "}
            <Input
              ariaLabel='Deck title'
              value={titleDraft}
              placeholder='Untitled Deck'
              className={styles.titleDeck}
              maxLength={100}
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
            {canViewAnalytics && (
              <Link to='/decks/$deckId/analytics' params={{ deckId }}>
                <Btn size={"md"} shape={"pill"}>
                  <ChartBarIcon className={styles.iconMd} />
                  Analytics
                </Btn>
              </Link>
            )}
            <Btn size={"md"} shape={"pill"} onClick={handleShareClick}>
              <ShareIcon className={styles.iconMd} />
              Share
            </Btn>
            <SplitBtn
              size={"md"}
              shape={"pill"}
              variant={"brand"}
              disabled={isStarting}
              aria-describedby={
                startError ? "start-interactiveSession-error" : undefined
              }
              onClick={() => {
                void quickStart(deckId);
              }}
              menuAriaLabel='More start options'
              menuItems={
                <>
                  <DropdownMenuItem onClick={handlePreview}>
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleScheduleClick}>
                    Schedule
                  </DropdownMenuItem>
                </>
              }>
              <PlayIcon className={styles.iconMd} />
              {isStarting ? "Starting…" : "Start"}
            </SplitBtn>
            {startError && (
              <span
                id='start-interactiveSession-error'
                className={styles.startError}
                role='alert'>
                {startError}
              </span>
            )}
          </div>
        </div>
      </CanvasHeader>
      <CanvasBody>
        <LeftSidebarContent />
        <InnerDisplay className={styles.slideCanvasContainer}>
          <SlideDisplay />
          <SpeakerNotesDrawer />
        </InnerDisplay>
        <RightSidebarContent />
      </CanvasBody>
    </MainBodyDashboard>
  );
};

export { DeckEditor };
