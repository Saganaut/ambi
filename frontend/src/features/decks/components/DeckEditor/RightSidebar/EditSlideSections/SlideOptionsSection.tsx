// Audience-and-display options for a Slide element. Carries the chrome that
// only Slides expose today — results display type, response gating, join
// info, free-form heading + rich participant note — plus the chunk-10
// `autoAdvanceSeconds` for unattended slideshow mode. The body of this file
// was lifted out of EditSlidePanel when that panel became a per-kind
// dispatcher; the same mirror/sync/commit pattern still applies. Form state
// lives in `useSlideOptionsForm` so this file is mostly JSX + commit calls.
import {
  ChartBarIcon,
  ChartPieIcon,
  HashtagIcon,
} from "@heroicons/react/24/outline";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { Input } from "@components/Forms/Input/Input/Input";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { RichTextInput } from "@components/Forms/Input/RichTextInput/RichTextInput";
import { ChartPreviewPopover } from "@decks/components/Charts/ChartPreview/ChartPreviewPopover";
import { useElementEditor } from "../../SlideContentTypes/useElementEditor";
import type { Slide } from "@store/AmbiApi";
import { relevanceFor, type ChartType } from "../data";
import { useSlideOptionsForm } from "./useSlideOptionsForm";
import type { SlideOptionsForm } from "./useSlideOptionsForm";
import styles from "../EditSlidePanel.module.css";

const isSlide = (e: { kind: string }): e is Slide => e.kind === "Slide";

type ResultsDisplayValue = NonNullable<Slide["resultsDisplayType"]>;

const CHART_OPTIONS: {
  value: ChartType;
  label: string;
  Icon: typeof ChartBarIcon;
  rotated?: boolean;
}[] = [
  {
    value: "BAR_HORIZONTAL",
    label: "Horizontal bars",
    Icon: ChartBarIcon,
    rotated: true,
  },
  { value: "BAR_VERTICAL", label: "Vertical bars", Icon: ChartBarIcon },
  { value: "WORD_CLOUD", label: "Word cloud", Icon: HashtagIcon },
  { value: "PIE_CHART", label: "Pie chart", Icon: ChartPieIcon },
];

const buildPatch = (
  element: Slide,
  form: SlideOptionsForm,
  overrides: Partial<Slide> = {},
): Slide => ({
  ...element,
  resultsDisplayType: form.resultsDisplayType,
  multipleSelectionsEnabled: form.multipleSelectionsEnabled,
  selectionsPerParticipant: form.selectionsPerParticipant,
  showResultsAsPercentage: form.showResultsAsPercentage,
  showJoinInformation: form.showJoinInformation,
  showQrCode: form.showQrCode,
  heading: form.heading,
  participantInformation:
    form.participantInformationHtml === ""
      ? undefined
      : // Codegen types this as a generic Map<string, object>; we store the
        // rich-text HTML under a single `html` key (see useSlideOptionsForm).
        ({ html: form.participantInformationHtml } as unknown as Record<
          string,
          object
        >),
  autoAdvanceSeconds: form.autoAdvanceEnabled
    ? form.autoAdvanceSeconds
    : undefined,
  ...overrides,
});

const SlideOptionsSection = () => {
  const { element, schedule, flush, commit, syncedFromId, markSynced } =
    useElementEditor<Slide>(isSlide);

  const { form, patch, resync } = useSlideOptionsForm(element);

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
    resync(element);
  }

  if (!element) return null;

  // chunk 21 — relevance map narrows what's controllable for this element.
  // Slide (any slideKind) suppresses chart picker / response gating; only the
  // lobby slide (slideKind=TITLE) surfaces QR + join chrome.
  const rel = relevanceFor({
    kind: element.kind,
    slideKind: element.slideKind,
  });
  const chartEnabled = new Set(rel.resultsCharts);

  const elId = element.id ?? "";

  return (
    <>
      <section className={styles.section}>
        <h4 className={styles.heading}>Results</h4>
        <div
          className={styles.chartPicker}
          role='radiogroup'
          aria-label='Results display type'>
          {CHART_OPTIONS.map(({ value, label, Icon, rotated }) => {
            // Legacy "HISTOGRAM" documents render as BAR_VERTICAL — the
            // backend kept the enum value for read-compat only.
            const normalized: ResultsDisplayValue =
              form.resultsDisplayType === "HISTOGRAM"
                ? "BAR_VERTICAL"
                : form.resultsDisplayType;
            const isActive = normalized === value;
            // The whole picker is disabled when the kind has no aggregate viz
            // (Slide / Q&A / Drawing / Matching / Grid / PlaceOnImage); within
            // an enabled picker, only the chart types the kind supports are
            // clickable (e.g. TextQuestion: WORD_CLOUD only).
            const isDisabled =
              !rel.resultsDisplayType || !chartEnabled.has(value);
            return (
              <ChartPreviewPopover
                key={value}
                chartType={value}
                label={label}
                placement='left'>
                <button
                  type='button'
                  role='radio'
                  aria-checked={isActive}
                  aria-label={label}
                  disabled={isDisabled}
                  className={[
                    styles.chartButton,
                    isActive ? styles.chartButtonActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    // Clicking the active button clears back to DEFAULT so the
                    // host inherits the kind's built-in viz.
                    const next: ResultsDisplayValue = isActive
                      ? "DEFAULT"
                      : value;
                    const nextForm = patch({ resultsDisplayType: next });
                    commit(buildPatch(element, nextForm));
                  }}>
                  <Icon
                    className={[
                      styles.chartIcon,
                      rotated === true ? styles.chartIconRotated : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden='true'
                  />
                </button>
              </ChartPreviewPopover>
            );
          })}
        </div>
        <Toggle
          id={`slide-percent-${elId}`}
          label='Show results as percentage'
          checked={form.showResultsAsPercentage}
          disabled={!rel.showResultsAsPercentage}
          onChange={(e) => {
            const nextForm = patch({
              showResultsAsPercentage: e.currentTarget.checked,
            });
            commit(buildPatch(element, nextForm));
          }}
        />
      </section>

      <section className={styles.section}>
        <h4 className={styles.heading}>Responses</h4>
        <Toggle
          id={`slide-multi-${elId}`}
          label='Allow multiple selections'
          checked={form.multipleSelectionsEnabled}
          disabled={!rel.multipleSelectionsEnabled}
          onChange={(e) => {
            const nextForm = patch({
              multipleSelectionsEnabled: e.currentTarget.checked,
            });
            commit(buildPatch(element, nextForm));
          }}
        />
        {form.multipleSelectionsEnabled && rel.multipleSelectionsEnabled && (
          <NumberInput
            label='Selections per participant'
            id={`slide-multi-count-${elId}`}
            min={0}
            value={form.selectionsPerParticipant}
            infoMessage='0 means unlimited'
            onChange={(next) => {
              const nextForm = patch({ selectionsPerParticipant: next });
              schedule(buildPatch(element, nextForm));
            }}
            onBlur={flush}
          />
        )}
        {/* showResponses moved to the shared BehaviorSection in chunk 24 so
            every interactive kind exposes the cascade override, not just
            Slide. */}
      </section>

      <section className={styles.section}>
        <h4 className={styles.heading}>Pacing</h4>
        <Toggle
          id={`slide-auto-advance-${elId}`}
          label='Auto-advance after a fixed delay'
          checked={form.autoAdvanceEnabled}
          disabled={!rel.autoAdvance}
          onChange={(e) => {
            const nextForm = patch({
              autoAdvanceEnabled: e.currentTarget.checked,
            });
            commit(buildPatch(element, nextForm));
          }}
        />
        {form.autoAdvanceEnabled && (
          <NumberInput
            id={`slide-auto-advance-seconds-${elId}`}
            label='Seconds before advancing'
            min={1}
            max={600}
            value={form.autoAdvanceSeconds}
            onChange={(next) => {
              const nextForm = patch({ autoAdvanceSeconds: next });
              schedule(buildPatch(element, nextForm));
            }}
            onBlur={flush}
          />
        )}
      </section>

      <section className={styles.section}>
        <h4 className={styles.heading}>Join</h4>
        <Toggle
          id={`slide-show-qr-${elId}`}
          label='Display QR code'
          checked={form.showQrCode}
          disabled={!rel.showQrCode}
          onChange={(e) => {
            const nextForm = patch({ showQrCode: e.currentTarget.checked });
            commit(buildPatch(element, nextForm));
          }}
        />
        <Toggle
          id={`slide-show-join-${elId}`}
          label='Display join info'
          checked={form.showJoinInformation}
          disabled={!rel.showJoinInformation}
          onChange={(e) => {
            const nextForm = patch({
              showJoinInformation: e.currentTarget.checked,
            });
            commit(buildPatch(element, nextForm));
          }}
        />
      </section>

      <section className={styles.section}>
        <h4 className={styles.heading}>Labels</h4>
        <Input
          label='Heading'
          id={`slide-heading-${elId}`}
          type='text'
          value={form.heading}
          placeholder='Slide heading…'
          onChange={(e) => {
            const nextForm = patch({ heading: e.target.value });
            schedule(buildPatch(element, nextForm));
          }}
          onBlur={flush}
        />
        <RichTextInput
          label='Information for participants'
          id={`slide-participant-info-${elId}`}
          placeholder='What participants should know before answering…'
          value={form.participantInformationHtml}
          onChange={(html) => {
            const nextForm = patch({ participantInformationHtml: html });
            schedule(buildPatch(element, nextForm));
          }}
          onBlur={flush}
        />
      </section>
    </>
  );
};

export { SlideOptionsSection };
