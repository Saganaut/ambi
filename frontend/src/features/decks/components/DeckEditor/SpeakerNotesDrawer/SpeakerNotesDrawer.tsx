/**
 * Drawer pinned to the bottom of the slide canvas, stretched full width
 * across the relative grandparent. The header sits on top and stays visible;
 * the body sits BELOW the header and animates its height open/closed so the
 * drawer's top edge slides upward when toggled. The header doubles as the
 * toggle button.
 *
 * Speaker notes live on EVERY element kind (not just Slide), so this drawer
 * reads/writes the active element's `speakerNotes` field regardless of kind.
 *
 * Edits use the same debounced-commit pattern as the SlideContentTypes
 * editors: type into RichTextInput → schedule(patch) → flush() on blur. The
 * apiEnhancements layer syncs the response into the getDeck cache.
 */
import { useRef, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useGetDeckQuery, type DeckResponse } from "@store/AmbiApi";
import { useDebouncedCommit } from "@hooks/useDebouncedCommit";
import {
  RichTextInput,
  type RichTextInputHandle,
} from "@components/Forms/Input/RichTextInput/RichTextInput";
import styles from "./SpeakerNotesDrawer.module.css";

type DeckElement = NonNullable<DeckResponse["elements"]>[number];

const routeApi = getRouteApi("/decks/$deckId/edit");

const SpeakerNotesDrawer = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();

  const { element } = useGetDeckQuery(
    { id: deckId },
    {
      selectFromResult: ({ data }) => ({
        element: data?.elements?.find((e) => e.id === slideId),
      }),
    },
  );

  const [updateElement] = useUpdateElementMutation();

  const commit = (patch: DeckElement) => {
    if (!element?.id) return;
    void updateElement({
      id: deckId,
      elementId: element.id,
      body: patch,
    })
      .unwrap()
      .catch((err: unknown) => {
        console.error("Failed to update speaker notes", err);
      });
  };

  const { schedule, flush } = useDebouncedCommit<DeckElement>(commit, 500);

  const [notes, setNotes] = useState<string>(
    element?.chrome?.speakerNotes ?? "",
  );
  const [syncedFromId, setSyncedFromId] = useState<string | undefined>(
    element?.id,
  );
  if (element && syncedFromId !== element.id) {
    setSyncedFromId(element.id);
    setNotes(element.chrome?.speakerNotes ?? "");
  }

  const [isOpen, setIsOpen] = useState(false);
  const editorRef = useRef<RichTextInputHandle>(null);

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
    if (!element) return;
    schedule({ ...element, chrome: { ...element.chrome, speakerNotes: html } });
  };

  const hasNotes = notes.trim() !== "" && notes !== "<p></p>";

  return (
    <section
      className={[styles.drawer, isOpen ? styles.open : ""]
        .filter(Boolean)
        .join(" ")}
      aria-label='Speaker notes'>
      <button
        type='button'
        className={styles.header}
        aria-expanded={isOpen}
        aria-controls='speaker-notes-body'
        onClick={handleToggle}>
        <span className={styles.headerLabel}>
          Speaker notes
          {hasNotes && <span className={styles.headerDot} aria-hidden='true' />}
        </span>
        <span className={styles.headerChevron} aria-hidden='true'>
          {isOpen ? <ChevronDownIcon /> : <ChevronUpIcon />}
        </span>
      </button>

      <div
        className={styles.body}
        id='speaker-notes-body'
        role='region'
        aria-label='Speaker notes editor'
        aria-hidden={!isOpen}>
        <div className={styles.bodyInner}>
          {element ? (
            <RichTextInput
              ref={editorRef}
              id={`speaker-notes-${element.id ?? ""}`}
              placeholder='Notes for the presenter — never shown to participants.'
              value={notes}
              onChange={handleNotesChange}
              onBlur={flush}
            />
          ) : (
            <p className={styles.emptyState}>
              Select a slide to add speaker notes.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export { SpeakerNotesDrawer };
