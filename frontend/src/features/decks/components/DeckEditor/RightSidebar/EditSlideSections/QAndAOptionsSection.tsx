// Per-kind inspector section for Q_AND_A slides. Uses useSlideEditor<"Q_AND_A">
// to read and write QAndAContent fields.
// Old field `minVotesToShow` is gone from the new model. `allowAnonymous`
// replaces `anonymousSubmissions`. The new model adds `moderated` and
// `maxResponses`.
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { useSlideEditor } from "@/features/decks/hooks/useSlideEditor";
import styles from "../EditSlidePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const useQAndAOptionsSection = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  return useSlideEditor(deckId, slideId ?? "", "Q_AND_A");
};

const QAndAOptionsSection = () => {
  const { slide, updateSlideContent, flush } = useQAndAOptionsSection();

  const content = slide?.content;
  const [allowAnonymous, setAllowAnonymous] = useState(
    content?.allowAnonymous ?? false,
  );
  const [moderated, setModerated] = useState(content?.moderated ?? false);
  const [maxResponses, setMaxResponses] = useState(content?.maxResponses ?? 0);
  const [syncedId, setSyncedId] = useState<string | undefined>(slide?.id);

  if (slide && syncedId !== slide.id) {
    setSyncedId(slide.id);
    setAllowAnonymous(slide.content.allowAnonymous ?? false);
    setModerated(slide.content.moderated ?? false);
    setMaxResponses(slide.content.maxResponses ?? 0);
  }

  if (!slide) return null;

  const slideId = slide.id;

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Q&amp;A moderation</h4>
      <Toggle
        id={`qa-anon-${slideId}`}
        label='Allow anonymous submissions'
        checked={allowAnonymous}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setAllowAnonymous(next);
          updateSlideContent({ allowAnonymous: next });
          flush();
        }}
      />
      <Toggle
        id={`qa-moderated-${slideId}`}
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
        id={`qa-max-responses-${slideId}`}
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
