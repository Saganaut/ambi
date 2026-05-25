// Toggle button for collapse/expand sections. Wraps IconBtn so it inherits
// the standard icon-button look; chevron rotates 180° when collapsed via the
// .isCollapsed modifier defined in Buttons.module.css.
import React from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { IconBtn } from "./IconBtn";
import styles from "./Buttons.module.css";

interface CollapseBtnProps {
  collapse: React.Dispatch<React.SetStateAction<boolean>>;
  isCollapsed: boolean;
}

const CollapseBtn = ({ collapse, isCollapsed }: CollapseBtnProps) => {
  return (
    <IconBtn
      fill='ghost'
      size='sm'
      icon={<ChevronDownIcon />}
      className={isCollapsed ? styles.isCollapsed : undefined}
      aria-label={isCollapsed ? "Expand" : "Collapse"}
      aria-expanded={!isCollapsed}
      onClick={() => {
        collapse(!isCollapsed);
      }}
    />
  );
};

export { CollapseBtn };
