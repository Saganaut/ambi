import { PanelKey } from "@/features/deck/store/panelSlice.ts";
import { RootState } from "@/shared/store/store.ts";
import { close, open } from "@deck/store/panelSlice.ts";
import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  ShareIcon,
  TrophyIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useFullScreen } from "@hooks/useFullScreen";
import { Btn } from "@saganaut/ambi-ui";
import DeckIcon from "@shared/assets/icons/content/deck-icon.svg?react";
import { getRouteApi } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { useSelector } from "react-redux";

import { Dashboard } from "@/shared/components/Layout/Dashboard/Dashboard";
import { useAppDispatch } from "@/shared/store/hooks";
import { PANEL_TITLES } from "./data";
import styles from "./RightSidebarContent.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const SLIDE_PANELS: { key: PanelKey; icon: ReactNode }[] = [
  { key: "edit", icon: <PencilSquareIcon /> },
  { key: "answers", icon: <CheckCircleIcon /> },
  { key: "quiz", icon: <TrophyIcon /> },
  { key: "discussion", icon: <ChatBubbleLeftRightIcon /> },
  { key: "participants", icon: <UsersIcon /> },
  { key: "sharing", icon: <ShareIcon /> },
];

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
    <Dashboard.EndPanel
      className={`${styles.rightSidebarContent} ${isFullScreen ? styles.isCollapsed : ""}`}
    >
      <div className={styles.iconStrip} role="toolbar" aria-label="Deck panels">
        <Btn
          type="button"
          aria-label={PANEL_TITLES.deck}
          aria-active={panelKey === "deck"}
          onClick={() => {
            toggle("deck");
          }}
          icon={<DeckIcon />}
          size="md"
          shape="squircle"
        />
        {slideId &&
          SLIDE_PANELS.map(({ key, icon }) => (
            <Btn
              key={key}
              type="button"
              aria-label={PANEL_TITLES[key]}
              aria-active={panelKey === "deck"}
              onClick={() => {
                toggle(key);
              }}
              icon={icon}
              size="md"
              shape="squircle"
            />
          ))}
      </div>
    </Dashboard.EndPanel>
  );
};

export { RightSidebarContent };
