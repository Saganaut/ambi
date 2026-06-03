// Top-level design system page. Each tab owns its own subset of demos so the
// main file stays slim and tab-specific state doesn't leak across the page.
// Tab order is: tokens (palettes + theme) → combinations (text/bg + actions)
// → rules (the 15-rule rulebook) → dashboard (game components) → forms →
// common (cards, modal, primitives, pricing).
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import styles from "./DesignSystem.module.css";
import "../../tokens.css";
import { Tabs } from "@common/Tabs/Tabs";
import { FormsSection } from "./FormsSection";
import { RulebookSection } from "./RulebookSection";
import { TextBackgroundCombinations } from "./TextBackgroundCombinations";
import { ActionCombinations } from "./ActionCombinations";
import { TokensTab } from "./TokensTab";
import { DashboardTab } from "./DashboardTab";
import { CommonTab } from "./CommonTab";

const DesignSystemPage = () => {
  const [mainTab, setMainTab] = useState("rules");

  return (
    <div className={styles.container}>
      <div>
        <div className={styles.sectionTitle}>Design System</div>
        <p className={styles.sectionDescription}>
          A quick view of the app palette, semantic token set, and simple
          component examples.
        </p>
        <Link to='/' className={styles.backLink} viewTransition>
          Back to home
        </Link>
      </div>
      <Tabs
        ariaLabel='Design system sections'
        value={mainTab}
        onChange={setMainTab}
        items={[
          {
            id: "tokens",
            label: "Color tokens",
            panel: <TokensTab />,
          },
          {
            id: "combinations",
            label: "Color combinations",
            panel: (
              <>
                <TextBackgroundCombinations />
                <ActionCombinations />
              </>
            ),
          },
          {
            id: "rules",
            label: "Rules",
            panel: <RulebookSection />,
          },
          {
            id: "dashboard",
            label: "Dashboard components",
            panel: <DashboardTab />,
          },
          {
            id: "forms",
            label: "Form components",
            panel: <FormsSection />,
          },
          {
            id: "common",
            label: "Common components",
            panel: <CommonTab />,
          },
        ]}
      />
    </div>
  );
};

export { DesignSystemPage };
