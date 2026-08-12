// Toggle button for collapse/expand sections. Renders the shared Btn with a
// ghost fill; the chevron sizing and the 180° collapsed rotation live in
// CollapseBtn.module.css.
import React from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Btn } from "./Btn";
import styles from "./CollapseBtn.module.css";

interface CollapseBtnProps {
  collapse: React.Dispatch<React.SetStateAction<boolean>>;
  isCollapsed: boolean;
}

const CollapseBtn = ({ collapse, isCollapsed }: CollapseBtnProps) => {
  return (
    <Btn
      fill='ghost'
      size='sm'
      icon={<ChevronDownIcon />}
      className={[styles.collapseBtn, isCollapsed && styles.isCollapsed].filter(Boolean).join(" ")}
      aria-label={isCollapsed ? "Expand" : "Collapse"}
      aria-expanded={!isCollapsed}
      onClick={() => {
        collapse(!isCollapsed);
      }}
    />
  );
};

export { CollapseBtn };
