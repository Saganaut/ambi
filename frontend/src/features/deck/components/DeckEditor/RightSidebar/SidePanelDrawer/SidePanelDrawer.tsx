import { IconBtn } from "@/shared/components/UIElements/Buttons/IconBtn";
import { RootState } from "@/shared/store/store";
import { close } from "@deck/store/panelSlice.ts";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { getRouteApi } from "@tanstack/react-router";
import { ErrorFallback } from "@ui/BoundaryFallbacks/ErrorFallback";
import { ErrorBoundary } from "@ui/ErrorBoundary/ErrorBoundary";
import { useSelector } from "react-redux";
import { AnswerPanel } from "../AnswerPanel/AnswerPanel";
import { PANEL_TITLES } from "../data";
import { DeckPanel } from "../DeckPanel/DeckPanel";
import { DeckDiscussionPanel } from "../DiscussionPanel/DeckDiscussionPanel";
import { EditSlidePanel } from "../EditSlidePanel/EditSlidePanel";
import { InviteSettingsPanel } from "../InvitePanel/InviteSettingsPanel";
import { ParticipantsPanel } from "../ParticipantPanel/ParticipantsPanel";
import { QuizPanel } from "../QuizPanel/QuizPanel";

import { useAppDispatch } from "@/shared/store/hooks";
import styles from "../RightSidebarContent.module.css";
const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const SidePanelDrawer = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { panelKey, isOpen } = useSelector((state: RootState) => state.panel);
  const dispatch = useAppDispatch();

  return (
    <>
      <aside
        className={`${[styles.drawer, isOpen && styles.isOpen].join(" ")}`}
        aria-label={PANEL_TITLES[panelKey]}
      >
        <div className={styles.panelContent} key={panelKey}>
          <div className={styles.drawerHeader}>
            <h3 className={styles.drawerTitle}>{PANEL_TITLES[panelKey]}</h3>
            <IconBtn
              fill="ghost"
              icon={<XMarkIcon />}
              size="xs"
              aria-label="Close panel"
              onClick={() => {
                dispatch(close());
              }}
            />
          </div>
          <div className={styles.drawerBody}>
            <ErrorBoundary
              key={`${panelKey}-${slideId ?? "none"}`}
              boundaryName="deck-editor-side-panel"
              fallback={<ErrorFallback message="Something went wrong loading this panel." />}
            >
              {panelKey === "deck" && <DeckPanel deckId={deckId} />}

              {slideId && (
                <>
                  {panelKey === "edit" && <EditSlidePanel deckId={deckId} slideId={slideId} />}
                  {panelKey === "answers" && <AnswerPanel deckId={deckId} slideId={slideId} />}
                  {panelKey === "quiz" && <QuizPanel deckId={deckId} slideId={slideId} />}
                  {panelKey === "discussion" && (
                    <DeckDiscussionPanel slideId={slideId} deckId={deckId} />
                  )}
                  {panelKey === "participants" && (
                    <ParticipantsPanel deckId={deckId} slideId={slideId} />
                  )}
                </>
              )}
              {panelKey === "sharing" && <InviteSettingsPanel deckId={deckId} />}
            </ErrorBoundary>
          </div>
        </div>
      </aside>
    </>
  );
};

export { SidePanelDrawer };
