import { PanelKey } from "@/features/deck/store/panelSlice.ts";
import { useAppDispatch } from "@/shared/hooks/storeHooks.ts";
import { RootState } from "@/shared/store/store.ts";
import { RightSidebar } from "@components/Layout/RightSidebar";
import { close, open } from "@deck/store/panelSlice.ts";
import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  PencilIcon,
  ShareIcon,
  TrophyIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useFullScreen } from "@hooks/useFullScreen";
import DeckIcon from "@shared/assets/icons/content/deck-icon.svg?react";
import { getRouteApi } from "@tanstack/react-router";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { useSelector } from "react-redux";

import styles from "./RightSidebarContent.module.css";
import { PANEL_TITLES } from "./data";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const RightSidebarContent = () => {
  const { isFullScreen } = useFullScreen();
  const { slideId } = routeApi.useSearch();
  const { panelKey, isOpen } = useSelector((state: RootState) => state.panel);

  const dispatch = useAppDispatch();

  const toggle = (key: PanelKey) => {
    if (isOpen && panelKey == key) {
      dispatch(close());
      return;
    }
    dispatch(open(key));
  };

  return (
    <RightSidebar
      className={`${styles.rightSidebarContent} ${isFullScreen ? styles.isCollapsed : ""}`}
    >
      <div className={styles.iconStrip} role="toolbar" aria-label="Deck panels">
        <IconBtn
          fill="bordered"
          shape="round"
          size="md"
          aria-label={PANEL_TITLES.deck}
          aria-pressed={panelKey === "deck"}
          className={panelKey === "deck" ? styles.active : undefined}
          icon={<DeckIcon />}
          onClick={() => {
            toggle("deck");
          }}
        />

        {slideId && (
          <>
            <IconBtn
              fill="bordered"
              shape="round"
              size="md"
              aria-label={PANEL_TITLES.edit}
              aria-pressed={panelKey === "edit"}
              className={panelKey === "edit" ? styles.active : undefined}
              icon={<PencilIcon />}
              onClick={() => {
                toggle("edit");
              }}
            />
            <IconBtn
              fill="bordered"
              shape="round"
              size="md"
              aria-label={PANEL_TITLES.answers}
              aria-pressed={panelKey === "answers"}
              className={panelKey === "answers" ? styles.active : undefined}
              icon={<CheckCircleIcon />}
              onClick={() => {
                toggle("answers");
              }}
            />
            <IconBtn
              fill="bordered"
              shape="round"
              size="md"
              aria-label={PANEL_TITLES.quiz}
              aria-pressed={panelKey === "quiz"}
              className={panelKey === "quiz" ? styles.active : undefined}
              icon={<TrophyIcon />}
              onClick={() => {
                toggle("quiz");
              }}
            />

            <IconBtn
              fill="bordered"
              shape="round"
              size="md"
              aria-label={PANEL_TITLES.discussion}
              aria-pressed={panelKey === "discussion"}
              className={panelKey === "discussion" ? styles.active : undefined}
              icon={<ChatBubbleLeftRightIcon />}
              onClick={() => {
                toggle("discussion");
              }}
            />
            <IconBtn
              fill="bordered"
              shape="round"
              size="md"
              aria-label={PANEL_TITLES.participants}
              aria-pressed={panelKey === "participants"}
              className={panelKey === "participants" ? styles.active : undefined}
              icon={<UsersIcon />}
              onClick={() => {
                toggle("participants");
              }}
            />
            <IconBtn
              fill="bordered"
              shape="round"
              size="md"
              aria-label={PANEL_TITLES.sharing}
              aria-pressed={panelKey === "sharing"}
              className={panelKey === "sharing" ? styles.active : undefined}
              icon={<ShareIcon />}
              onClick={() => {
                toggle("sharing");
              }}
            />
          </>
        )}
      </div>
    </RightSidebar>
  );
};

export { RightSidebarContent };
