import { ReactNode } from "react";
import styles from "./SlideWrapper.module.css";
const SlideContentSection = ({ children }: { children: ReactNode }) => {
  return <div className={styles.slideContentSection}>{children}</div>;
};

const Header = ({ children }: { children: ReactNode }) => {
  return <div className={styles.header}>{children}</div>;
};

const Body = ({ children }: { children: ReactNode }) => {
  return <div className={styles.sectionBody}>{children}</div>;
};

const Footer = ({ children }: { children: ReactNode }) => {
  return <div className={styles.footer}>{children}</div>;
};

SlideContentSection.Header = Header;
SlideContentSection.Body = Body;
SlideContentSection.Footer = Footer;

const SlideContent = ({ children }: { children: ReactNode }) => {
  return <div className={styles.content}>{children}</div>;
};

export { SlideContentSection };

export { SlideContent };
