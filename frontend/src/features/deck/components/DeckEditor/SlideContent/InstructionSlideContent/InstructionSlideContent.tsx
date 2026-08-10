/**
 * Author surface for a non-scorable "instruction" slide — tells players how to
 * join the live session. The join URL and code are session-runtime values filled
 * in when the deck is presented (shown here as a static preview); the only
 * authorable fields are an optional custom heading and body rendered above that
 * join block.
 */
import { Input } from "@components/Forms/Input/Input/Input";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import { useState } from "react";
import { SlideContentProps } from "../_shared/Item.types";
import { SlideWrapper } from "../SlideWrapper";
import styles from "./InstructionSlideContent.module.css";

const DEFAULT_HEADING = "Join the game!";

const InstructionSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const { slide, updateSlideContent, flush } = useSlideEditor(deckId, slideId, "INSTRUCTION");

  const [heading, setHeading] = useState(slide?.content.heading ?? "");
  const [body, setBody] = useState(slide?.content.body ?? "");
  const [syncedFromId, setSyncedFromId] = useState(slide?.id);
  if (slide && syncedFromId !== slide.id) {
    setSyncedFromId(slide.id);
    setHeading(slide.content.heading ?? "");
    setBody(slide.content.body ?? "");
  }

  if (!slide) {
    return (
      <SlideWrapper title="Instructions">
        <p>Select a slide to edit.</p>
      </SlideWrapper>
    );
  }

  return (
    <SlideWrapper
      title="Join instructions"
      description="Players see how to join the live session. The link and code are filled in automatically when you present."
      footer={<p>The join link and code are generated when the session starts.</p>}
    >
      <Input
        label="Heading"
        id={`instruction-heading-${slide.id}`}
        type="text"
        fullWidth
        value={heading}
        placeholder={DEFAULT_HEADING}
        onChange={(e) => {
          const next = e.target.value;
          setHeading(next);
          updateSlideContent({ heading: next });
        }}
        onBlur={flush}
      />
      <Input
        label="Message"
        id={`instruction-body-${slide.id}`}
        type="text"
        fullWidth
        value={body}
        placeholder="Optional message shown under the heading"
        onChange={(e) => {
          const next = e.target.value;
          setBody(next);
          updateSlideContent({ body: next });
        }}
        onBlur={flush}
      />

      <div className={styles.preview} aria-hidden="true">
        <p className={styles.previewHeading}>{heading.trim() || DEFAULT_HEADING}</p>
        {body.trim() !== "" && <p className={styles.previewBody}>{body}</p>}
        <p className={styles.previewLine}>
          Go to <span className={styles.token}>{"{join link}"}</span>
        </p>
        <p className={styles.previewLine}>
          Enter code <span className={styles.token}>{"{code}"}</span>
        </p>
      </div>
    </SlideWrapper>
  );
};

export { InstructionSlideContent };
