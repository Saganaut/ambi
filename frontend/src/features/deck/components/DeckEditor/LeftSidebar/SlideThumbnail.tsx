/**
 * Deck editor left rail unit: slide card + optional indented follow-up.
 * Drags as a single block; follow-up is not independently draggable.
 * * Features:
 * - Renders the shared SlideCard row & handles click selection (writes slideId
 *   to the route).
 * - Right-click dropdown: delete, "Add follow-up" (if eligible).
 * - Delete with follow-up triggers server cascade (requires confirmation dialog).
 * - Self-scrolls into view via HTML id on creation/activation.
 * - @dnd-kit drag handle for parent reordering.
 */
import { useConfirm } from "@/shared/components/ConfirmDialog/useConfirm";
import { DropdownMenu, DropdownMenuItem } from "@components/Menus/DropdownMenu";
import { RichTextDisplay } from "@components/Forms/Input/RichTextDisplay/RichTextDisplay";
import { useDeckEditor } from "@deck/hooks/useDeckEditor";
import { SlideResponse } from "@deck/store/deckApi.gen";
import { useSortable } from "@dnd-kit/react/sortable";
import { useNavigate } from "@tanstack/react-router";
import React, { useEffect, useRef } from "react";
import { SlideCard } from "../../SlideCard/SlideCard";
import styles from "./LeftSidebarContent.module.css";

const slideDisplayName = (slide: SlideResponse): string => {
  const trimmed = slide.title.trim();
  return trimmed === "" ? `${slide.content.contentType} Slide` : trimmed;
};

interface SlideThumbnailProps {
  slide: SlideResponse;
  followUp?: SlideResponse;
  canAddFollowUp: boolean;
  sortIndex: number;
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
  const { removeSlide, addFollowUp } = useDeckEditor(deckId, currentQuestionId);
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
        message: "This slide has a follow-up slide. Deleting it deletes the follow-up too.",
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
      className={`${styles.slideThumbnailWrapper} ${isDragging ? styles.isDragging : ""}`}
      ref={setRefs}
    >
      <DropdownMenu
        position={"top-left"}
        anchorToCursor
        trigger={(toggle) => (
          <SlideCard
            slideType={slide.content.contentType}
            title={
              <RichTextDisplay value={slideDisplayName(slide)} maxLength={20} styled={false} />
            }
            index={displayNumber}
            active={isActive}
            onContextMenu={(e) => {
              e.preventDefault();
              toggle(e);
            }}
            onClick={() => {
              selectSlide(slide.id);
            }}
          />
        )}
      >
        {canAddFollowUp && (
          <DropdownMenuItem
            onClick={() => {
              addFollowUp(slide.id);
            }}
          >
            Add follow-up slide
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => {
            void handleDeleteSlide();
          }}
        >
          Delete slide
        </DropdownMenuItem>
      </DropdownMenu>
      {followUp && (
        <div id={followUp.id} className={styles.followUpThumbnailWrapper}>
          <DropdownMenu
            position={"top-left"}
            anchorToCursor
            trigger={(toggle) => (
              <SlideCard
                slideType={followUp.content.contentType}
                title={
                  <RichTextDisplay
                    value={slideDisplayName(followUp)}
                    maxLength={20}
                    styled={false}
                  />
                }
                index={`${displayNumber}a`}
                active={isFollowUpActive}
                size="sm"
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggle(e);
                }}
                onClick={() => {
                  selectSlide(followUp.id);
                }}
              />
            )}
          >
            <DropdownMenuItem
              onClick={() => {
                removeSlide(followUp.id);
              }}
            >
              Delete follow-up
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

export { SlideThumbnail };
