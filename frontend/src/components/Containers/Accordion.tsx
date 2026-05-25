import React, { useState, type ReactNode } from "react";
import styles from "./Containers.module.css";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

interface AccordionProps {
  titleBar: string;
  children: ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({ titleBar, children }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <section className={styles.accordion}>
      <h4 className={styles.accordionTitle}>
        <button
          type='button'
          aria-expanded={!isCollapsed}
          className={`${styles.accordionTitleSection} ${isCollapsed ? styles.isCollapsed : ""}`}
          onClick={() => {
            setIsCollapsed(!isCollapsed);
          }}>
          <span>{titleBar}</span> <ChevronDownIcon />
        </button>
      </h4>

      <div
        className={`${styles.collapsableSection} ${isCollapsed ? styles.isCollapsed : ""}`}>
        {" "}
        {children}
      </div>
    </section>
  );
};

export { Accordion };
