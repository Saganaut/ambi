/**
 * Pill button with a paired chevron face that opens a dropdown menu. Use when
 * you have one primary action plus secondary related actions — the primary
 * face stays one click away while the chevron reveals the rest.
 *
 * Mirrors Btn's variant / fill / size / shape props so the two faces inherit
 * the same color slot; the chevron face shares the variant and renders a
 * `ChevronDownIcon`. Menu content is any combination of `DropdownMenuItem`,
 * `DropdownMenuDivider`, etc. from `@/components/Menus/DropdownMenu`.
 */
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

import { Btn } from "../Btn";
import type { BtnFill, BtnShape, BtnSize, BtnVariant } from "../BtnTypes";
import { DropdownMenu } from "@/components/Menus/DropdownMenu";
import styles from "./SplitBtn.module.css";

type MenuPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

interface SplitBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  fill?: BtnFill;
  size?: BtnSize;
  shape?: BtnShape;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
  children?: ReactNode;
  menuItems: ReactNode;
  menuPosition?: MenuPosition;
  menuAriaLabel?: string;
}

const SplitBtn = ({
  variant = "primary",
  fill = "default",
  size = "md",
  shape = "default",
  icon,
  iconPosition = "left",
  isLoading,
  disabled,
  className,
  children,
  menuItems,
  menuPosition = "top-right",
  menuAriaLabel = "More options",
  ...rest
}: SplitBtnProps) => {
  return (
    <div className={[styles.splitBtn, className].filter(Boolean).join(" ")}>
      <Btn
        variant={variant}
        fill={fill}
        size={size}
        shape={shape}
        icon={icon}
        iconPosition={iconPosition}
        isLoading={isLoading}
        disabled={disabled}
        className={styles.primary}
        {...rest}>
        {children}
      </Btn>
      <DropdownMenu
        position={menuPosition}
        trigger={(toggle) => (
          <Btn
            variant={variant}
            fill={fill}
            size={size}
            shape={shape}
            disabled={disabled ?? isLoading}
            aria-label={menuAriaLabel}
            className={styles.chevron}
            onClick={() => {
              toggle();
            }}>
            <ChevronDownIcon className={styles.chevronIcon} />
          </Btn>
        )}>
        {menuItems}
      </DropdownMenu>
    </div>
  );
};

export { SplitBtn };
