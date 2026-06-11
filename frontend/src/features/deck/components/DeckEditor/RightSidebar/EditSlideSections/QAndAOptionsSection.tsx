// Per-kind inspector section for Q_AND_A slides. `moderated` and `maxResponses`
// are content fields (edited via useSlideEditor<"Q_AND_A">); `allowAnonymous`
// has moved onto the slide's answer settings, so it is written through
// useSlideSettingsEditor.
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import { useSlideSettingsEditor } from "@deck/hooks/useSlideSettingsEditor";
import styles from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const QAndAOptionsSection = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { slide, updateSlideContent, flush } = useSlideEditor(
    deckId,
    slideId ?? "",
    "Q_AND_A",
  );
  const {
    answerSettings,
    updateAnswerSettings,
    flush: flushSettings,
  } = useSlideSettingsEditor(deckId, slideId ?? "");

  const content = slide?.content;
  const [allowAnonymous, setAllowAnonymous] = useState(
    answerSettings?.allowAnonymous ?? false,
  );
  const [moderated, setModerated] = useState(content?.moderated ?? false);
  const [maxResponses, setMaxResponses] = useState(content?.maxResponses ?? 0);
  const [syncedId, setSyncedId] = useState<string | undefined>(slide?.id);

  if (slide && syncedId !== slide.id) {
    setSyncedId(slide.id);
    setAllowAnonymous(answerSettings?.allowAnonymous ?? false);
    setModerated(slide.content.moderated ?? false);
    setMaxResponses(slide.content.maxResponses ?? 0);
  }

  if (!slide) return null;

  const slideId2 = slide.id;

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Q&amp;A moderation</h4>
      <Toggle
        id={`qa-anon-${slideId2}`}
        label='Allow anonymous submissions'
        checked={allowAnonymous}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setAllowAnonymous(next);
          updateAnswerSettings({ allowAnonymous: next });
          flushSettings();
        }}
      />
      <Toggle
        id={`qa-moderated-${slideId2}`}
        label='Moderate submissions before showing'
        checked={moderated}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setModerated(next);
          updateSlideContent({ moderated: next });
          flush();
        }}
      />
      <NumberInput
        id={`qa-max-responses-${slideId2}`}
        label='Max responses (0 = unlimited)'
        min={0}
        max={1000}
        value={maxResponses}
        onChange={(next) => {
          setMaxResponses(next);
          updateSlideContent({ maxResponses: next === 0 ? undefined : next });
        }}
        onBlur={flush}
      />
    </section>
  );
};

export { QAndAOptionsSection };
