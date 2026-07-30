/**
 * Drawer pinned to the bottom of the slide canvas, stretched full width
 * across the relative grandparent. The header sits on top and stays visible;
 * the body sits BELOW the header and animates its height open/closed so the
 * drawer's top edge slides upward when toggled. The header doubles as the
 * toggle button.
 *
 * Speaker notes live on EVERY slide kind, so this drawer reads/writes the
 * active slide's `speakerNotes` field via {@link useSlideEditor}.
 * Edits are debounced inside the hook and flushed on blur.
 */
import {
  RichTextInput,
  type RichTextInputHandle,
} from "@components/Forms/Input/RichTextInput/RichTextInput";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { getRouteApi } from "@tanstack/react-router";
import { useRef, useState } from "react";
import styles from "./SpeakerNotesDrawer.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const SpeakerNotesDrawer = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();

  const { slide, updateMetadata, flush } = useSlideEditor(deckId, slideId ?? "");

  const [notes, setNotes] = useState<string>(slide?.speakerNotes ?? "");
  const [syncedFromId, setSyncedFromId] = useState<string | undefined>(slide?.id);
  const [isOpen, setIsOpen] = useState(false);
  const editorRef = useRef<RichTextInputHandle>(null);

  if (slide && syncedFromId !== slide.id) {
    setSyncedFromId(slide.id);
    setNotes(slide.speakerNotes ?? "");
  }

  // Closing the drawer only animates `max-height` to 0 — the contenteditable
  // inside stays focused, which leaves the BubbleMenu toolbar floating in
  // empty space (and may also leave the link popover open). Drive both
  // signals to false via the editor's imperative handle so the toolbar
  // dismisses with the drawer.
  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (!next) editorRef.current?.blur();
      return next;
    });
  };

  const handleNotesChange = (html: string) => {
    setNotes(html);
    updateMetadata({ speakerNotes: html });
  };

  const hasNotes = notes.trim() !== "" && notes !== "<p></p>";
  const isReady = slideId != null && slide != null;

  return (
    <section
      className={[styles.drawer, isOpen ? styles.open : ""].filter(Boolean).join(" ")}
      aria-label="Speaker notes"
    >
      <button
        type="button"
        className={styles.header}
        aria-expanded={isOpen}
        aria-controls="speaker-notes-body"
        onClick={handleToggle}
      >
        <span className={styles.headerLabel}>
          Speaker notes
          {hasNotes && <span className={styles.headerDot} aria-hidden="true" />}
        </span>
        <span className={styles.headerChevron} aria-hidden="true">
          {isOpen ? <ChevronDownIcon /> : <ChevronUpIcon />}
        </span>
      </button>

      <div
        className={styles.body}
        id="speaker-notes-body"
        role="region"
        aria-label="Speaker notes editor"
        aria-hidden={!isOpen}
      >
        <div className={styles.bodyInner}>
          {isReady && (
            <RichTextInput
              ref={editorRef}
              id={`speaker-notes-${slide.id ?? ""}`}
              placeholder="Notes for the presenter — never shown to participants."
              value={notes}
              onChange={handleNotesChange}
              onBlur={flush}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export { SpeakerNotesDrawer };
