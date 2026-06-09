// Per-kind inspector section for TEXT slides. Uses useSlideEditor<"TEXT">
// to read and write TextContent fields.
// Old fields `fuzzyMatch` and `fuzzyDistance` are gone from the new model.
// The new model adds `caseSensitive` and `matchMode`.
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import styles from "../EditSlidePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const useTextOptionsSection = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  return useSlideEditor(deckId, slideId ?? "", "TEXT");
};

const TextOptionsSection = () => {
  const { slide, updateSlideContent, flush } = useTextOptionsSection();

  const content = slide?.content;
  const [maxLength, setMaxLength] = useState(content?.maxLength ?? 80);
  const [trimWhitespace, setTrimWhitespace] = useState(
    content?.trimWhitespace ?? true,
  );
  const [caseSensitive, setCaseSensitive] = useState(
    content?.caseSensitive ?? false,
  );
  const [syncedId, setSyncedId] = useState<string | undefined>(slide?.id);

  if (slide && syncedId !== slide.id) {
    setSyncedId(slide.id);
    setMaxLength(slide.content.maxLength ?? 80);
    setTrimWhitespace(slide.content.trimWhitespace ?? true);
    setCaseSensitive(slide.content.caseSensitive ?? false);
  }

  if (!slide) return null;

  const slideId = slide.id;

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Text answer</h4>
      <NumberInput
        id={`text-max-length-${slideId}`}
        label='Max length'
        min={1}
        max={500}
        value={maxLength}
        onChange={(next) => {
          setMaxLength(next);
          updateSlideContent({ maxLength: next });
        }}
        onBlur={flush}
      />
      <Toggle
        id={`text-trim-${slideId}`}
        label='Trim whitespace before scoring'
        checked={trimWhitespace}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setTrimWhitespace(next);
          updateSlideContent({ trimWhitespace: next });
          flush();
        }}
      />
      <Toggle
        id={`text-case-${slideId}`}
        label='Case-sensitive matching'
        checked={caseSensitive}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setCaseSensitive(next);
          updateSlideContent({ caseSensitive: next });
          flush();
        }}
      />
    </section>
  );
};

export { TextOptionsSection };
