/**
 * Single rail unit in the deck editor's left rail: a slide tile plus, when one
 * is attached, its follow-up rendered as an indented tile inside the same
 * sortable wrapper — so the pair drags as one block and the follow-up itself is
 * never independently draggable.
 *
 * Renders the slide preview, exposes a right-click dropdown for slide actions
 * (delete; "Add follow-up slide" on eligible slides), and selects a slide on
 * click by writing `slideId` into the route search. Deleting a slide with an
 * attached follow-up cascades server-side, so it's gated behind the promise
 * confirm dialog. The wrapper carries an HTML `id` so callers (e.g. the
 * add-slide flow) can scroll a freshly-created slide into view; the thumbnail
 * also self-scrolls when it becomes the active one so deep-link navigations
 * land in the visible scroll region. Drag handle comes from @dnd-kit's sortable
 * hook so the parent's DragDropProvider can reorder it.
 */
import React, { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { useNavigate } from "@tanstack/react-router";
import { DropdownMenu, DropdownMenuItem } from "@components/Menus/DropdownMenu";
import { useConfirm } from "@/shared/components/ConfirmDialog/useConfirm";
import styles from "./LeftSidebarContent.module.css";
import { SlideResponse } from "@deck/store/deckApi.gen";
import { useDeckEditor } from "@deck/hooks/useDeckEditor";
import { SlideThumbnailContent } from "./SlideThumbnailContent";

/** Friendly label for the thumbnail — falls back when the slide is untitled. */
const slideDisplayName = (slide: SlideResponse): string => {
  const trimmed = slide.title.trim();
  return trimmed === "" ? "Untitled slide" : trimmed;
};

interface SlideThumbnailProps {
  slide: SlideResponse;
  /** The slide's attached follow-up, rendered inside this unit (not sortable). */
  followUp?: SlideResponse;
  /** Whether the context menu offers "Add follow-up slide". */
  canAddFollowUp: boolean;
  /** Position among the rail's *units* — the @dnd-kit sortable index space. */
  sortIndex: number;
  /** 1-based position among the deck's *slides* — the number badge. */
  displayNumber: number;
  deckId: string;
  currentQuestionId?: string;
}

const SlideThumbnail: React.FC<SlideThumbnailProps> = ({
  slide,
  followUp,
  canAddFollowUp,
  sortIndex,
  displayNumber,
  deckId,
  currentQuestionId,
}) => {
  const { removeSlide, addFollowUp } = useDeckEditor(deckId);
  const confirm = useConfirm();

  const navigate = useNavigate({ from: "/decks/$deckId/edit" });

  const wrapperRef = useRef<HTMLDivElement>(null);

  const { ref, isDragging } = useSortable({ id: slide.id, index: sortIndex });

  const isActive = currentQuestionId === slide.id;
  const isFollowUpActive = currentQuestionId === followUp?.id;
  useEffect(() => {
    if (!isActive && !isFollowUpActive) return;
    wrapperRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [isActive, isFollowUpActive]);

  const selectSlide = (slideId: string) => {
    void navigate({
      search: (prev) => ({ ...prev, slideId: slideId }),
    });
  };

  const handleDeleteSlide = async () => {
    if (followUp) {
      const ok = await confirm({
        title: "Delete slide?",
        message:
          "This slide has a follow-up slide. Deleting it deletes the follow-up too.",
        confirmLabel: "Delete both",
        variant: "danger",
      });
      if (!ok) return;
    }
    removeSlide(slide.id);
  };

  // Combine @dnd-kit's sortable ref with our own ref so we can imperatively
  // scroll the thumbnail into view.
  const setRefs = (node: HTMLDivElement | null) => {
    wrapperRef.current = node;
    if (typeof ref === "function") ref(node);
  };

  return (
    <div
      id={slide.id}
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
            onClick={() => {
              selectSlide(slide.id);
            }}
            className={`${styles.slideThumbnail} ${isActive && styles.active}`}>
            <SlideThumbnailContent
              slideType={slide.content.contentType}
              title={slideDisplayName(slide)}
            />
          </div>
        )}>
        {canAddFollowUp && (
          <DropdownMenuItem
            onClick={() => {
              addFollowUp(slide.id);
            }}>
            Add follow-up slide
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => {
            void handleDeleteSlide();
          }}>
          Delete slide
        </DropdownMenuItem>
      </DropdownMenu>
      <div className={styles.slideIndex}> {displayNumber} </div>
      {followUp && (
        <div id={followUp.id} className={styles.followUpThumbnailWrapper}>
          <DropdownMenu
            position={"top-left"}
            anchorToCursor
            trigger={(toggle) => (
              <div
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggle(e);
                }}
                onClick={() => {
                  selectSlide(followUp.id);
                }}
                className={`${styles.slideThumbnail} ${styles.followUpThumbnail} ${isFollowUpActive && styles.active}`}>
                <SlideThumbnailContent
                  slideType={followUp.content.contentType}
                  title={slideDisplayName(followUp)}
                />
              </div>
            )}>
            <DropdownMenuItem
              onClick={() => {
                removeSlide(followUp.id);
              }}>
              Delete follow-up
            </DropdownMenuItem>
          </DropdownMenu>
          <div className={styles.slideIndex}> {displayNumber}a </div>
        </div>
      )}
    </div>
  );
};

export { SlideThumbnail };
