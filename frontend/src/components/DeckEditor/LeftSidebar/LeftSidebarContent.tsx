/**
 * Slide list for the deck editor — drives the dashboard's left rail.
 *
 * Pulls the live deck via RTK Query so we always render the server's source of
 * truth. The "New Slide" button opens a modal asking the user to pick which
 * element kind to add; clicking a tile closes the modal and appends a freshly
 * uuid'd element. The @dnd-kit drag handler persists reorders by calling the
 * moveElement mutation (with an optimistic local reorder so the drop feels
 * instant).
 */

import { DragDropProvider } from "@dnd-kit/react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Btn } from "../../Common/Buttons/Btn";
import { SlideThumbnail } from "./SlideThumbnail";
import styles from "./LeftSidebarContent.module.css";
import { useDeckEditor } from "../useDeckEditor";
import { NewElementPicker } from "../NewElementPicker";
import { useModal } from "@/context/useModal";
import type { ElementKind } from "@/components/Common/Slides/SlideTypeGraphics/slideTypeGraphics";
import type { DeckResponse } from "@/store/BrainFlexApi";
import { LeftSidebar } from "@/components/Layout/LeftSidebar";
import { useFullScreen } from "@/context/useFullScreen";

export type DeckElement = NonNullable<DeckResponse["elements"]>[number];

/** Friendly label for the thumbnail — slides have titles, questions have prompts. */
const elementDisplayName = (element: DeckElement): string => {
  if (element.kind === "Slide") {
    const trimmed = element.chrome?.title?.trim() ?? "";
    return trimmed === "" ? "Untitled slide" : trimmed;
  }
  if ("prompt" in element && element.prompt) return element.prompt;
  return "Untitled";
};

const LeftSidebarContent = () => {
  const { handleAddElement, handleDragEnd, elements, deckId, questionId } =
    useDeckEditor();
  const { openModal, closeModal } = useModal();
  const { isFullScreen } = useFullScreen();
  const handleNewSlideClick = () => {
    openModal({
      title: "Choose a slide type",
      content: (
        <NewElementPicker
          onPick={(kind: ElementKind) => {
            closeModal();
            handleAddElement(kind);
          }}
        />
      ),
    });
  };

  return (
    <LeftSidebar
      className={`${styles.leftSidebarContent} ${isFullScreen ? styles.isCollapsed : ""} `}>
      <div>
        <Btn onClick={handleNewSlideClick}>New Slide</Btn>
      </div>
      <div className={styles.slideContainer}>
        {elements.length === 0 ? (
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
            {elements.map((element, index) => (
              <SlideThumbnail
                key={element.id}
                index={index}
                id={element.id ?? ""}
                name={elementDisplayName(element)}
                slideType={element.kind}
                currentQuestionId={questionId}
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
