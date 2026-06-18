/**
 * Author surface for a follow-up slide.
 *
 * A follow-up has almost no authorable content — its options come from the
 * parent round's participant submissions at session runtime — so the canvas
 * is the question prompt (slide title, like every other kind), a banner naming
 * what the mode asks, and a read-only preview that makes the runtime contract
 * legible: for PREDICT_POPULAR on an MCQ parent, the parent's options render
 * as ghosted, non-interactive tiles. The mode itself is edited in the right
 * sidebar's follow-up section.
 */
import React, { useState } from "react";
import { useSlide } from "@deck/hooks/useSlide";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import { FOLLOW_UP_MODE_LABELS } from "@deck/utils/followUp";
import { SlideContentWrapper } from "../SlideContentWrapper";
import type { SlideContentProps } from "../slideContentProps";
import styles from "./FollowUpSlideContent.module.css";

/** Strip the title down for display; falls back when the parent is untitled. */
const parentDisplayName = (title: string | undefined): string => {
  const trimmed = title?.trim() ?? "";
  return trimmed === "" ? "the previous slide" : `“${trimmed}”`;
};

const FollowUpSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const { slide, updateMetadata, flush } = useSlideEditor(
    deckId,
    slideId,
    "FOLLOW_UP",
  );
  const { slides } = useSlide(deckId);

  // Only the prompt needs a local mirror — typing should feel responsive while
  // commits debounce. `syncedFromId` resets the mirror when the active slide
  // changes ("derive state during render" pattern, same as McqSlideContent).
  const [prompt, setPrompt] = useState(slide?.title ?? "");
  const [syncedFromId, setSyncedFromId] = useState(slide?.id);
  if (slide && syncedFromId !== slide.id) {
    setSyncedFromId(slide.id);
    setPrompt(slide.title);
  }

  if (!slide) {
    return (
      <SlideContentWrapper title='Follow-up'>
        <p>Select a slide to edit.</p>
      </SlideContentWrapper>
    );
  }

  const parent = slides.find((s) => s.id === slide.parentId);
  const mode = slide.content.mode;
  // For an MCQ parent the runtime option set derives from its options either
  // way (PREDICT_POPULAR votes over all of them; BEST_ANSWER_VOTE over the
  // ones participants picked), so they make a faithful ghost preview for both
  // modes. Free-form parents have nothing to preview until the session runs.
  const parentMcqOptions =
    parent?.content.contentType === "MCQ" ? parent.content.options : undefined;
  const ghostCaption =
    mode === "PREDICT_POPULAR"
      ? "Participants will predict which of these was picked most in"
      : "Participants will vote for the best of the answers given in";

  return (
    <SlideContentWrapper
      prompt={{
        idBase: `follow-up-${slide.id}`,
        value: prompt,
        placeholder: "Type your question…",
        onChange: (html) => {
          setPrompt(html);
          updateMetadata({ title: html });
        },
        onBlur: flush,
      }}
      footer={
        <p>
          Options are filled in from {parentDisplayName(parent?.title)} during
          the live session — there is nothing to author here.
        </p>
      }>
      <div className={styles.modeBanner}>{FOLLOW_UP_MODE_LABELS[mode]}</div>
      {parentMcqOptions ? (
        <>
          <div
            className={styles.ghostOptions}
            style={
              {
                "--cols": Math.max(
                  Math.ceil(parentMcqOptions.length / 2),
                  2,
                ),
              } as React.CSSProperties
            }>
            {parentMcqOptions.map((option) => (
              <div key={option.id} className={styles.ghostOption}>
                {option.text?.trim() || "Untitled option"}
              </div>
            ))}
          </div>
          <p className={styles.ghostCaption}>
            {ghostCaption} {parentDisplayName(parent?.title)}.
          </p>
        </>
      ) : (
        <div className={styles.ghostPlaceholder}>
          Participants&apos; submissions on the parent slide become the options
          here.
        </div>
      )}
    </SlideContentWrapper>
  );
};

export { FollowUpSlideContent };
