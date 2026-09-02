import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import styles from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import { useSlideSettings } from "@deck/hooks/useSlideSettings";
import { Toggle } from "@saganaut/ambi-ui";
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const QAndAOptionsSection = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { slide, updateSlideContent, flush } = useSlideEditor(deckId, slideId ?? "", "Q_AND_A");
  const {
    answerSettings,
    scheduleAnswerSettings,
    flush: flushSettings,
  } = useSlideSettings(deckId, slideId ?? "");

  const content = slide?.content;
  const [allowAnonymous, setAllowAnonymous] = useState(answerSettings?.allowAnonymous ?? false);
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
      <div className={styles.rows}>
        <Toggle
          labelPosition="start"
          id={`qa-anon-${slideId2}`}
          label="Allow anonymous submissions"
          checked={allowAnonymous}
          onChange={(e) => {
            const next = e.currentTarget.checked;
            setAllowAnonymous(next);
            scheduleAnswerSettings({ allowAnonymous: next });
            flushSettings();
          }}
        />
        <Toggle
          labelPosition="start"
          id={`qa-moderated-${slideId2}`}
          label="Moderate submissions before showing"
          checked={moderated}
          onChange={(e) => {
            const next = e.currentTarget.checked;
            setModerated(next);
            updateSlideContent({ moderated: next });
            flush();
          }}
        />
        <NumberInput
          labelPosition="labelInFront"
          compact
          id={`qa-max-responses-${slideId2}`}
          label="Max questions per player (0 = unlimited)"
          min={0}
          max={1000}
          value={maxResponses}
          onChange={(next) => {
            setMaxResponses(next);
            updateSlideContent({ maxResponses: next === 0 ? undefined : next });
          }}
          onBlur={flush}
        />
      </div>
    </section>
  );
};

export { QAndAOptionsSection };
