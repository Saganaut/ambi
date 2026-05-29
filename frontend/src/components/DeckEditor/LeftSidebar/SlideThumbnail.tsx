/**
 * Single slide tile in the deck editor's left rail.
 *
 * Renders the slide preview, exposes a right-click dropdown for slide actions
 * (delete for now — clone / add / comment to come), and selects this slide on
 * click by writing `questionId` into the route search. The wrapper carries an
 * HTML `id` so callers (e.g. the add-element flow) can scroll a freshly-created
 * slide into view; the thumbnail also self-scrolls when it becomes the active
 * one so deep-link navigations land in the visible scroll region. Drag handle
 * comes from @dnd-kit's sortable hook so the parent's DragDropProvider can
 * reorder it.
 */
import React, { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { DropdownMenu, DropdownMenuItem } from "../../Menus/DropdownMenu";
import { useDeleteElementMutation } from "@/store/AmbiApi";
import styles from "./LeftSidebarContent.module.css";
import { SlideThumbnailContent } from "./SlideThumbnailContent";
import type { ElementKind } from "@/components/Common/Slides/SlideTypeGraphics/slideTypeGraphics";

interface SlideThumbnailProps {
  name: string;
  id: string;
  slideType: ElementKind;
  index: number;
  deckId: string;
  currentQuestionId?: string;
}

const routeApi = getRouteApi("/decks/$deckId/edit");

const SlideThumbnail: React.FC<SlideThumbnailProps> = ({
  name,
  id,
  slideType,
  index,
  deckId,
  currentQuestionId,
}) => {
  const navigate = useNavigate({ from: routeApi.id });
  const [deleteElement] = useDeleteElementMutation();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { ref, isDragging } = useSortable({ id, index });

  const isActive = currentQuestionId === id;
  useEffect(() => {
    if (!isActive) return;
    wrapperRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [isActive]);

  const handleSelectQuestion = () => {
    void navigate({
      search: (prev) => ({ ...prev, questionId: id }),
    });
  };

  const handleDeleteSlide = () => {
    void deleteElement({ id: deckId, elementId: id })
      .unwrap()
      .then(() => {
        if (currentQuestionId === id) {
          void navigate({
            search: (prev) => ({ ...prev, questionId: undefined }),
          });
        }
      })
      .catch((err: unknown) => {
        console.error("Failed to delete slide", err);
      });
  };

  // Combine @dnd-kit's sortable ref with our own ref so we can imperatively
  // scroll the thumbnail into view.
  const setRefs = (node: HTMLDivElement | null) => {
    wrapperRef.current = node;
    if (typeof ref === "function") ref(node);
  };

  return (
    <div
      id={id}
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
