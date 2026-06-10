// Per-kind inspector section for FOLLOW_UP slides. The only authorable content
// is the mode (what the follow-up asks about the parent round's submissions),
// restricted to the modes valid for the parent slide's content type — with
// MCQ-only parents today that's a single-option select, but it's the one place
// mode is editable. Also links back to the parent slide for orientation.
import { getRouteApi } from "@tanstack/react-router";
import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import { Btn } from "@ui/Buttons/Btn";
import { useSlide } from "@deck/hooks/useSlide";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import type { FollowUpMode } from "@deck/store/deckEnums.gen";
import {
  FOLLOW_UP_MODE_LABELS,
  followUpModesFor,
} from "@deck/utils/followUp";
import styles from "../EditSlidePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const FollowUpOptionsSection = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { slide, updateSlideContent, flush } = useSlideEditor(
    deckId,
    slideId ?? "",
    "FOLLOW_UP",
  );
  const { getSlide } = useSlide(deckId);

  if (!slide) return null;

  const parent = slide.parentId ? getSlide(slide.parentId) : undefined;
  const validModes = parent
    ? followUpModesFor(parent.content.contentType)
    : [slide.content.mode];

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Follow-up</h4>
      <Dropdown
        id={`follow-up-mode-${slide.id}`}
        label='Mode'
        options={validModes.map((mode) => ({
          value: mode,
          label: FOLLOW_UP_MODE_LABELS[mode],
        }))}
        value={[slide.content.mode]}
        onChange={(values) => {
          const next = values[0] as FollowUpMode | undefined;
          if (!next || next === slide.content.mode) return;
          updateSlideContent({ mode: next });
          flush();
        }}
      />
      {parent && (
        <Btn
          onClick={() => {
            void navigate({
              search: (prev) => ({ ...prev, slideId: parent.id }),
            });
          }}>
          Go to parent slide
        </Btn>
      )}
    </section>
  );
};

export { FollowUpOptionsSection };
