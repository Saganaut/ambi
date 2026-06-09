/**
 * Single slide tile in the deck editor's left rail.
 *
 * Renders the slide preview, exposes a right-click dropdown for slide actions
 * (delete for now — clone / add / comment to come), and selects this slide on
 * click by writing `slideId` into the route search. The wrapper carries an
 * HTML `id` so callers (e.g. the add-element flow) can scroll a freshly-created
 * slide into view; the thumbnail also self-scrolls when it becomes the active
 * one so deep-link navigations land in the visible scroll region. Drag handle
 * comes from @dnd-kit's sortable hook so the parent's DragDropProvider can
 * reorder it.
 */
import React, { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { useNavigate } from "@tanstack/react-router";
import { DropdownMenu, DropdownMenuItem } from "@components/Menus/DropdownMenu";
import styles from "./LeftSidebarContent.module.css";
import { SlideType } from "@deck/store/deckEnums.gen";
import { useDeckEditor } from "@deck/hooks/useDeckEditor";
import { SlideThumbnailContent } from "./SlideThumbnailContent";

interface SlideThumbnailProps {
  name: string;
  slideId: string;
  slideType: SlideType;
  index: number;
  deckId: string;
  currentQuestionId?: string;
}

const SlideThumbnail: React.FC<SlideThumbnailProps> = ({
  name,
  slideId,
  slideType,
  index,
  deckId,
  currentQuestionId,
}) => {
  const { removeSlide } = useDeckEditor(deckId);

  const navigate = useNavigate({ from: "/decks/$deckId/edit" });

  const wrapperRef = useRef<HTMLDivElement>(null);

  const { ref, isDragging } = useSortable({ id: slideId, index });

  const isActive = currentQuestionId === slideId;
  useEffect(() => {
    if (!isActive) return;
    wrapperRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [isActive]);

  const handleSelectQuestion = () => {
    void navigate({
      search: (prev) => ({ ...prev, slideId: slideId }),
    });
  };

  const handleDeleteSlide = () => {
    void removeSlide(slideId);
  };

  // Combine @dnd-kit's sortable ref with our own ref so we can imperatively
  // scroll the thumbnail into view.
  const setRefs = (node: HTMLDivElement | null) => {
    wrapperRef.current = node;
    if (typeof ref === "function") ref(node);
  };

  return (
    <div
      id={slideId}
      className={`${styles.slideThumbnailWrapper} ${isDragging && styles.isDragging}`}
      ref={setRefs}>
      <DropdownMenu
        position={"top-left"}
        anchorToCursor
        trigger={(toggle) => (
          <div
            onContextMenu={(e) => {
              e.preventDefault();
              toggle(e);
            }}
            onClick={handleSelectQuestion}
            className={`${styles.slideThumbnail} ${isActive && styles.active}`}>
            <SlideThumbnailContent slideType={slideType} title={name} />
          </div>
        )}>
        <DropdownMenuItem onClick={handleDeleteSlide}>
          Delete slide
        </DropdownMenuItem>
      </DropdownMenu>
      <div className={styles.slideIndex}> {index + 1} </div>
    </div>
  );
};

export { SlideThumbnail };
