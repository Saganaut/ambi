// Reference catalog organized as a 2D matrix: each column is a color
// (BtnVariant), each row is a fill (BtnFill = default / bordered / ghost).
// Every cell shows a live Btn + IconBtn so the page is the source of truth
// for what each legal combination looks like. The rule + naming convention
// is in styling-rules.md "Named button + icon-button variants".
import type { ReactNode } from "react";
import {
  BellIcon,
  TrashIcon,
  StarIcon,
  HeartIcon,
  PencilSquareIcon,
  UserIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Btn } from "@ui/Buttons/Btn";
import { IconBtn } from "@ui/Buttons/IconBtn";
import styles from "./DesignSystem.module.css";
import { BtnVariant, BtnFill } from "@ui/Buttons/BtnTypes";

interface VariantInfo {
  name: BtnVariant;
  description: string;
  tokens: string[];
  icon: ReactNode;
}

// One row per variant. The icon is purely illustrative — picked so the
// destructive/positive/neutral feel matches the variant's semantic.
const VARIANTS: VariantInfo[] = [
  {
    name: "primary",
    description:
      "Neutral workhorse CTA. Default for both Btn and IconBtn — bg-secondary + text-primary.",
    tokens: ["--bg-secondary", "--text-primary"],
    icon: <BellIcon />,
  },
  {
    name: "secondary",
    description:
      "Quieter neutral. Use when the action should recede behind a primary on the same surface.",
    tokens: ["--bg-subtle", "--text-secondary"],
    icon: <PencilSquareIcon />,
  },
  {
    name: "brand",
    description:
      "Brand-colored CTA. Reserve for the marquee call to action — one per view at most.",
    tokens: ["--bg-brand", "--text-on-brand", "--border-brand"],
    icon: <StarIcon />,
  },
  {
    name: "info",
    description: "Informational action — read more, view details.",
    tokens: ["--bg-info", "--text-info", "--border-info"],
    icon: <MagnifyingGlassIcon />,
  },
  {
    name: "error",
    description:
      "Destructive action. Reserve for permanent-removal flows; pair with a confirm dialog.",
    tokens: ["--bg-error", "--text-error", "--border-error"],
    icon: <TrashIcon />,
  },
  {
    name: "success",
    description: "Confirmation of a completed operation.",
    tokens: ["--bg-success", "--text-success", "--border-success"],
    icon: <HeartIcon />,
  },
  {
    name: "warning",
    description: "Proceed-with-caution action.",
    tokens: ["--bg-warning", "--text-warning", "--border-warning"],
    icon: <MagnifyingGlassIcon />,
  },
  {
    name: "disabled",
    description:
      "Visually disabled treatment. Use when the control needs to read as unavailable without the platform :disabled state (e.g., looks-disabled-but-clickable explainer flow).",
    tokens: ["--bg-disabled", "--text-disabled", "--border-disabled"],
    icon: <UserIcon />,
  },
];

const FILLS: { name: BtnFill; label: string; description: string }[] = [
  {
    name: "default",
    label: "default",
    description: "Filled — variant bg, no visible border.",
  },
  {
    name: "bordered",
    label: "bordered",
    description: "Filled + the variant's border color on top.",
  },
  {
    name: "ghost",
    label: "ghost",
    description: "Transparent bg + transparent border — text/icon only.",
  },
];

interface VariantSectionProps {
  variant: VariantInfo;
}

const VariantSection = ({ variant }: VariantSectionProps) => {
  return (
    <div className={styles.combinationGroup}>
      <h4 className={styles.combinationGroupTitle}>
        <code>variant=&quot;{variant.name}&quot;</code>
      </h4>
      <p className={styles.sectionDescription}>{variant.description}</p>
      <div className={styles.combinationFillGrid}>
        {FILLS.map((fill) => (
          <div key={fill.name} className={styles.combinationActionCard}>
            <div className={styles.combinationFillLabel}>
              <code>fill=&quot;{fill.label}&quot;</code>
            </div>
            <div className={styles.combinationActionSlot}>
              <Btn variant={variant.name} fill={fill.name}>
                Action
              </Btn>
              <Btn variant={variant.name} fill={fill.name} size='sm'>
                sm
              </Btn>
              <IconBtn
                variant={variant.name}
                fill={fill.name}
                icon={variant.icon}
                aria-label={`${variant.name} ${fill.name}`}
              />
              <IconBtn
                variant={variant.name}
                fill={fill.name}
                shape='round'
                size='sm'
                icon={variant.icon}
                aria-label={`${variant.name} ${fill.name} round`}
              />
            </div>
            <div className={styles.combinationTokens}>{fill.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ActionCombinations = () => {
  return (
    <>
      <div className={styles.combinationGroup}>
        <h4 className={styles.combinationGroupTitle}>Two-axis vocabulary</h4>
        <p className={styles.sectionDescription}>
          <strong>variant</strong> picks the color slot — eight semantic colors.{" "}
          <strong>fill</strong> picks how that color renders —{" "}
          <code>default</code> (background, no border), <code>bordered</code>{" "}
          (background + border), or <code>ghost</code> (no background, no
          border). Any color × any fill is legal, so{" "}
          <code>variant=&quot;error&quot; fill=&quot;ghost&quot;</code> gives a
          red text-only destructive button.
        </p>
        <p className={styles.sectionDescription}>
          For a close (X) button, pass <code>XMarkIcon</code> as the icon and
          use <code>fill=&quot;ghost&quot;</code>:
        </p>
        <div className={styles.combinationActionCard}>
          <div className={styles.combinationActionSlot}>
            <IconBtn fill='ghost' icon={<XMarkIcon />} aria-label='Close' />
            <IconBtn
              fill='ghost'
              icon={<XMarkIcon />}
              size='sm'
              aria-label='Close small'
            />
            <IconBtn
              fill='ghost'
              icon={<XMarkIcon />}
              size='xs'
              aria-label='Close extra-small'
            />
          </div>
        </div>
      </div>
      {VARIANTS.map((variant) => (
        <VariantSection key={variant.name} variant={variant} />
      ))}
    </>
  );
};

export { ActionCombinations };
