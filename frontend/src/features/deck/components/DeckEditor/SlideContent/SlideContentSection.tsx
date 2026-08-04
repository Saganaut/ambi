import { ReactNode } from "react";
import styles from "./SlideWrapper.module.css";

interface BaseProps {
  children: ReactNode;
  className?: string;
}

const SlideContentSection = ({ children, className }: BaseProps) => {
  const combinedClassName = [styles.slideContentSection, className].filter(Boolean).join(" ");

  return <div className={combinedClassName}>{children}</div>;
};

const Header = ({ children, className }: BaseProps) => {
  const combinedClassName = [styles.header, className].filter(Boolean).join(" ");
  return <div className={combinedClassName}>{children}</div>;
};

const Body = ({ children, className }: BaseProps) => {
  const combinedClassName = [styles.sectionBody, className].filter(Boolean).join(" ");

  return <div className={combinedClassName}>{children}</div>;
};

const Footer = ({ children, className }: BaseProps) => {
  const combinedClassName = [styles.footer, className].filter(Boolean).join(" ");
  return <div className={combinedClassName}>{children}</div>;
};

SlideContentSection.Header = Header;
SlideContentSection.Body = Body;
SlideContentSection.Footer = Footer;

const SlideContent = ({ children, className }: BaseProps) => {
  const combinedClassName = [styles.content, className].filter(Boolean).join(" ");
  return <div className={combinedClassName}>{children}</div>;
};

export { SlideContent, SlideContentSection };
