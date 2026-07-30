// Inspector affordance for a slide's follow-up: on an eligible scorable slide
// it offers "Add follow-up slide" (the discoverable home; the thumbnail's
// context menu is the fast path), and on a slide that already has one attached
// it links to it. Slides that can't have a follow-up (non-scorable kinds,
// follow-ups themselves) render nothing.
import { getRouteApi } from "@tanstack/react-router";
import { Btn } from "@ui/Buttons/Btn";
import { useDeckEditor } from "@deck/hooks/useDeckEditor";
import type { SlideResponse } from "@deck/store/deckApi.gen";
import { attachedFollowUpOf, canHaveFollowUp } from "@deck/utils/followUp";
import styles from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

interface FollowUpAttachSectionProps {
  slide: SlideResponse;
}

const FollowUpAttachSection = ({ slide }: FollowUpAttachSectionProps) => {
  const { deckId } = routeApi.useParams();
  const navigate = routeApi.useNavigate();
  const { slides, addFollowUp } = useDeckEditor(deckId);

  const attached = attachedFollowUpOf(slide, slides);

  if (attached) {
    return (
      <section className={styles.section}>
        {/* <h4 className={styles.heading}>Follow-up</h4> */}
        <p className={styles.empty}>
          A follow-up slide is attached — it runs right after this one and
          builds on its answers.
        </p>
        <Btn
          onClick={() => {
            void navigate({
              search: (prev) => ({ ...prev, slideId: attached.id }),
            });
          }}>
          Edit follow-up
        </Btn>
      </section>
    );
  }

  if (!canHaveFollowUp(slide, slides)) return null;

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Follow-up</h4>
      <p className={styles.empty}>
        Add a follow-up slide that builds on this slide&apos;s answers during
        the live session.
      </p>
      <Btn
        onClick={() => {
          addFollowUp(slide.id);
        }}>
        Add follow-up slide
      </Btn>
    </section>
  );
};

export { FollowUpAttachSection };
