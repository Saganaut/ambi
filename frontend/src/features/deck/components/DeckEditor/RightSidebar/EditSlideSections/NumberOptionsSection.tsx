// Per-kind inspector section for NUMBER slides. Uses useSlideEditor<"NUMBER">
// to read and write NumberContent fields.
// Old `allowNegative` is gone. The new model always has `min`/`max` (display
// range) plus a `tolerance` and `unit`.
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { Input } from "@components/Forms/Input/Input/Input";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import styles from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const NumberOptionsSection = () => {

  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();

  if (slideId == null) throw Error("Missing Slide ID");

  const { slide, updateSlideContent, flush } = useSlideEditor(deckId, slideId, "NUMBER");

  const content = slide?.content;
  const [minValue, setMinValue] = useState(content?.min ?? 0);
  const [maxValue, setMaxValue] = useState(content?.max ?? 100);
  const [tolerance, setTolerance] = useState(content?.tolerance ?? 0);
  const [unit, setUnit] = useState(content?.unit ?? "");
  const [syncedId, setSyncedId] = useState<string | undefined>(slide?.id);

  if (slide && syncedId !== slide.id) {
    setSyncedId(slide.id);
    setMinValue(slide.content.min ?? 0);
    setMaxValue(slide.content.max ?? 100);
    setTolerance(slide.content.tolerance ?? 0);
    setUnit(slide.content.unit ?? "");
  }

  if (!slide) return null;


  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Numeric answer</h4>
      <NumberInput
        id={`number-min-${slideId}`}
        label='Minimum'
        value={minValue}
        onChange={(next) => {
          setMinValue(next);
          updateSlideContent({ min: next });
        }}
        onBlur={flush}
      />
      <NumberInput
        id={`number-max-${slideId}`}
        label='Maximum'
        value={maxValue}
        onChange={(next) => {
          setMaxValue(next);
          updateSlideContent({ max: next });
        }}
        onBlur={flush}
      />
      <NumberInput
        id={`number-tolerance-${slideId}`}
        label='Tolerance (accepted deviation)'
        min={0}
        value={tolerance}
        onChange={(next) => {
          setTolerance(next);
          updateSlideContent({ tolerance: next });
        }}
        onBlur={flush}
      />
      <Input
        id={`number-unit-${slideId}`}
        label='Unit (e.g. km, °C)'
        type='text'
        value={unit}
        placeholder='Optional unit label…'
        onChange={(e) => {
          const next = e.target.value;
          setUnit(next);
          updateSlideContent({ unit: next });
        }}
        onBlur={flush}
      />
    </section>
  );
};

export { NumberOptionsSection };
