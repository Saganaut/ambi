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
import { SlideThumbnail } from "./SlideThumbnail";
import styles from "./LeftSidebarContent.module.css";

import { useFullScreen } from "@hooks/useFullScreen";
import { LeftSidebar } from "@/shared/components/Layout/LeftSidebar";
import { useDeckEditor } from "@/features/decks/hooks/useDeckEditor";
import { getRouteApi } from "@tanstack/react-router";
import { SlideResponse } from "@/shared/store/AmbiApi";

/** Friendly label for the thumbnail — falls back when the slide is untitled. */
const slideDisplayName = (slide: SlideResponse): string => {
  const trimmed = slide.title.trim();
  return trimmed === "" ? "Untitled slide" : trimmed;
};

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const LeftSidebarContent = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();

  const { addSlide, handleDragEnd, slides } = useDeckEditor(deckId);
  const { isFullScreen } = useFullScreen();
  // TODO: restore the slide-type picker modal once a slide-based picker exists
  // (NewElementPicker is still element-based). For now, add a default slide.
  const handleNewSlideClick = () => {
    addSlide();
  };

  console.log("slide in left sidebarecontent", slides);
  return (
    <LeftSidebar
      className={`${styles.leftSidebarContent} ${isFullScreen ? styles.isCollapsed : ""} `}>
      <div>
        <Btn onClick={handleNewSlideClick}>New Slide</Btn>
      </div>
      <div className={styles.slideContainer}>
        {slides.length === 0 ? (
          <button
            type='button'
            className={styles.emptySlide}
            onClick={handleNewSlideClick}
            aria-label='Create your first slide'>
            <span className={styles.emptySlideIcon} aria-hidden='true'>
              <PlusIcon />
            </span>
            <span className={styles.emptySlideTitle}>
              Create your first slide
            </span>
            <span className={styles.emptySlideSubtitle}>
              Pick a question type to add to the deck.
            </span>
          </button>
        ) : (
          <DragDropProvider
            onDragEnd={(event) => {
              handleDragEnd(event);
            }}>
            {slides.map((slide, index) => (
              <SlideThumbnail
                key={slide.id}
                index={index}
                slideId={slide.id}
                name={slideDisplayName(slide)}
                slideType={slide.content.contentType}
                currentQuestionId={slideId}
                deckId={deckId}
              />
            ))}
          </DragDropProvider>
        )}
      </div>
    </LeftSidebar>
  );
};

export { LeftSidebarContent };
