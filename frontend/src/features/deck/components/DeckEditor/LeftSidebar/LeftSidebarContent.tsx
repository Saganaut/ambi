/**
 * Slide list for the deck editor — drives the dashboard's left rail.
 *
 * Pulls the live deck via RTK Query so we always render the server's source of
 * truth. The "New Slide" button appends a freshly uuid'd slide and selects it.
 * The @dnd-kit drag handler persists reorders by calling the moveSlide mutation
 * (with an optimistic local reorder so the drop feels instant).
 */

import { DragDropProvider } from "@dnd-kit/react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Btn } from "@ui/Buttons/Btn";
import styles from "./LeftSidebarContent.module.css";
import { SlideThumbnail } from "./SlideThumbnail";

import { Dashboard } from "@/shared/components/Layout/Dashboard/Dashboard";
import { useModal } from "@/shared/hooks/useModal";
import { useDeckEditor } from "@deck/hooks/useDeckEditor";
import { SlideType } from "@deck/store/deckEnums.gen";
import { canHaveFollowUp, groupIntoUnits } from "@deck/utils/followUp";
import { useFullScreen } from "@hooks/useFullScreen";
import { getRouteApi } from "@tanstack/react-router";
import { NewSlideModal } from "../NewSlideModal/NewSlideModal";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const LeftSidebarContent = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();

  const { addSlide, handleDragEnd, slides } = useDeckEditor(deckId, slideId);
  const { isFullScreen } = useFullScreen();
  const { openModal, closeModal } = useModal();

  // Pop the slide-type picker; picking a tile creates a slide of that kind
  // (default content stamped in `useSlide`) and closes the modal.
  const handleNewSlideClick = () => {
    openModal({
      title: "New Slide",
      content: (
        <NewSlideModal
          onPick={(slideType: SlideType) => {
            addSlide({ slideType });
            closeModal();
          }}
        />
      ),
    });
  };
  return (
    <Dashboard.StartPanel
      className={`${styles.leftSidebarContent} ${isFullScreen ? styles.isCollapsed : ""} `}
    >
      <div>
        <Btn onClick={handleNewSlideClick}>New Slide</Btn>
      </div>
      <div className={styles.slideContainer}>
        {slides.length === 0 ? (
          <button
            type="button"
            className={styles.emptySlide}
            onClick={handleNewSlideClick}
            aria-label="Create your first slide"
          >
            <span className={styles.emptySlideIcon} aria-hidden="true">
              <PlusIcon />
            </span>
            <span className={styles.emptySlideTitle}>Create your first slide</span>
            <span className={styles.emptySlideSubtitle}>
              Pick a question type to add to the deck.
            </span>
          </button>
        ) : (
          <DragDropProvider
            onDragEnd={(event) => {
              handleDragEnd(event);
            }}
          >
            {(() => {
              // The rail renders *units*: a parent and its attached follow-up
              // share one sortable wrapper so the pair drags as a block and the
              // follow-up can't be dragged on its own. The number badge counts
              // slides (the follow-up shows as "Na"), so track both indexes.
              let slideNumber = 0;
              return groupIntoUnits(slides).map((unit, unitIndex) => {
                slideNumber += 1;
                const displayNumber = slideNumber;
                if (unit.followUp) slideNumber += 1;
                return (
                  <SlideThumbnail
                    key={unit.head.id}
                    slide={unit.head}
                    followUp={unit.followUp}
                    canAddFollowUp={canHaveFollowUp(unit.head, slides)}
                    sortIndex={unitIndex}
                    displayNumber={displayNumber}
                    currentQuestionId={slideId}
                    deckId={deckId}
                  />
                );
              });
            })()}
          </DragDropProvider>
        )}
      </div>
    </Dashboard.StartPanel>
  );
};

export { LeftSidebarContent };
