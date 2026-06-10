/**
 * Vertical icon rail on the right edge of the deck editor with four toggleable
 * panels. Clicking an icon toggles its drawer; clicking a different icon
 * switches to that panel; clicking the active icon closes the drawer. The
 * drawer slides in to the LEFT of the rail (overlaying the slide canvas) so
 * the icon strip itself never moves.
 *
 * Panels are placeholder-only for now — content is "yet to be decided" per
 * spec. Replace the corresponding *Panel sub-components when we have copy.
 */
import { useState } from "react";
import { flushSync } from "react-dom";
import {
  PencilIcon,
  PaintBrushIcon,
  UsersIcon,
  ShareIcon,
  TagIcon,
  StarIcon,
  TrophyIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ThemePanel } from "./ThemePanel";
import { EditSlidePanel } from "./EditSlidePanel";
import { AnswerSettingsPanel } from "./AnswerSettingsPanel";
import { PointSettingsPanel } from "./PointSettingsPanel";
import { DeckCategorizePanel } from "./DeckCategorizePanel";
import { DeckReviewsPanel } from "./DeckReviewsPanel";
import { DeckDiscussionPanel } from "./DeckDiscussionPanel";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { InviteSettingsPanel } from "./InviteSettingsPanel";
import styles from "./RightSidebarContent.module.css";
import { useFullScreen } from "@hooks/useFullScreen";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { RightSidebar } from "@components/Layout/RightSidebar";

type PanelKey =
  | "edit"
  | "answers"
  | "points"
  | "theme"
  | "categorize"
  | "reviews"
  | "discussion"
  | "participants"
  | "sharing";

const PANEL_TITLES: Record<PanelKey, string> = {
  edit: "Edit slide",
  answers: "Answer settings",
  points: "Point settings",
  theme: "Theme",
  categorize: "Tags",
  reviews: "Reviews",
  discussion: "Discussion",
  participants: "Participants",
  sharing: "Sharing preferences",
};

const RightSidebarContent = () => {
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const { isFullScreen } = useFullScreen();

  const setPanel = (next: PanelKey | null) => {
    const isSwap = openPanel !== null && next !== null && openPanel !== next;
    if (isSwap && typeof document.startViewTransition === "function") {
      document.startViewTransition(() => {
        // flushSync is required inside startViewTransition so React commits
        // the state change before the browser snapshots the "after" frame.
        // eslint-disable-next-line react-dom/no-flush-sync
        flushSync(() => {
          setOpenPanel(next);
        });
      });
    } else {
      setOpenPanel(next);
    }
  };

  const toggle = (key: PanelKey) => {
    setPanel(openPanel === key ? null : key);
  };

  return (
    <RightSidebar
      className={`${styles.rightSidebarContent} ${isFullScreen ? styles.isCollapsed : ""}`}>
      {openPanel !== null && (
        <aside className={styles.drawer} aria-label={PANEL_TITLES[openPanel]}>
          <div className={styles.panelContent} key={openPanel}>
            <div className={styles.drawerHeader}>
              <h3 className={styles.drawerTitle}>{PANEL_TITLES[openPanel]}</h3>
              <IconBtn
                fill='ghost'
                icon={<XMarkIcon />}
                size='sm'
                aria-label='Close panel'
                onClick={() => {
                  setPanel(null);
                }}
              />
            </div>
            <div className={styles.drawerBody}>
              {openPanel === "edit" && <EditSlidePanel />}
              {openPanel === "answers" && <AnswerSettingsPanel />}
              {openPanel === "points" && <PointSettingsPanel />}
              {openPanel === "theme" && <ThemePanel />}
              {openPanel === "categorize" && <DeckCategorizePanel />}
              {openPanel === "reviews" && <DeckReviewsPanel />}
              {openPanel === "discussion" && <DeckDiscussionPanel />}
              {openPanel === "participants" && <ParticipantsPanel />}
              {openPanel === "sharing" && <InviteSettingsPanel />}
            </div>
          </div>
        </aside>
      )}

      <div className={styles.iconStrip} role='toolbar' aria-label='Deck panels'>
        <IconBtn
          fill='bordered'
          shape='round'
          size='md'
          aria-label={PANEL_TITLES.edit}
          aria-pressed={openPanel === "edit"}
          className={openPanel === "edit" ? styles.active : undefined}
          icon={<PencilIcon />}
          onClick={() => {
            toggle("edit");
          }}
        />
        <IconBtn
          fill='bordered'
          shape='round'
          size='md'
          aria-label={PANEL_TITLES.answers}
          aria-pressed={openPanel === "answers"}
          className={openPanel === "answers" ? styles.active : undefined}
          icon={<CheckCircleIcon />}
          onClick={() => {
            toggle("answers");
          }}
        />
        <IconBtn
          fill='bordered'
          shape='round'
          size='md'
          aria-label={PANEL_TITLES.points}
          aria-pressed={openPanel === "points"}
          className={openPanel === "points" ? styles.active : undefined}
          icon={<TrophyIcon />}
          onClick={() => {
            toggle("points");
          }}
        />
        <IconBtn
          fill='bordered'
          shape='round'
          size='md'
          aria-label={PANEL_TITLES.theme}
          aria-pressed={openPanel === "theme"}
          className={openPanel === "theme" ? styles.active : undefined}
          icon={<PaintBrushIcon />}
          onClick={() => {
            toggle("theme");
          }}
        />
        <IconBtn
          fill='bordered'
          shape='round'
          size='md'
          aria-label={PANEL_TITLES.categorize}
          aria-pressed={openPanel === "categorize"}
          className={openPanel === "categorize" ? styles.active : undefined}
          icon={<TagIcon />}
          onClick={() => {
            toggle("categorize");
          }}
        />
        <IconBtn
          fill='bordered'
          shape='round'
          size='md'
          aria-label={PANEL_TITLES.reviews}
          aria-pressed={openPanel === "reviews"}
          className={openPanel === "reviews" ? styles.active : undefined}
          icon={<StarIcon />}
          onClick={() => {
            toggle("reviews");
          }}
        />
        <IconBtn
          fill='bordered'
          shape='round'
          size='md'
          aria-label={PANEL_TITLES.discussion}
          aria-pressed={openPanel === "discussion"}
          className={openPanel === "discussion" ? styles.active : undefined}
          icon={<ChatBubbleLeftRightIcon />}
          onClick={() => {
            toggle("discussion");
          }}
        />
        <IconBtn
          fill='bordered'
          shape='round'
          size='md'
          aria-label={PANEL_TITLES.participants}
          aria-pressed={openPanel === "participants"}
          className={openPanel === "participants" ? styles.active : undefined}
          icon={<UsersIcon />}
          onClick={() => {
            toggle("participants");
          }}
        />
        <IconBtn
          fill='bordered'
          shape='round'
          size='md'
          aria-label={PANEL_TITLES.sharing}
          aria-pressed={openPanel === "sharing"}
          className={openPanel === "sharing" ? styles.active : undefined}
          icon={<ShareIcon />}
          onClick={() => {
            toggle("sharing");
          }}
        />
      </div>
    </RightSidebar>
  );
};

export { RightSidebarContent };
