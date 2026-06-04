import styles from "./SessionRoundTracker.module.css";
import { SlideTypeGraphicSvg } from "@decks/components/Slides/SlideTypeGraphics/SlideTypeGraphic";

// eslint-disable-next-line unused-imports/no-unused-vars
const PHASES = ["SUBMIT", "VOTE", "REVEAL"] as const;
type Phase = (typeof PHASES)[number];

interface SessionRoundThumbnailInterface {
  className?: string;
  roundPhase?: Phase;
  slide: any;
  isActive: boolean;
}

const phaseClasses: Record<Phase, string> = {
  SUBMIT: "submit",
  VOTE: "vote",
  REVEAL: "reveal",
};

const SessionRoundThumbnail = ({
  className,
  roundPhase,
  slide,
  isActive,
}: SessionRoundThumbnailInterface) => {
  console.log("slide", slide);
  console.log("isActive", isActive);
  const phaseKey = roundPhase ? phaseClasses[roundPhase] : "inactive";
  return (
    <div
      className={`${styles.sessionRoundThumbnail} ${className ?? ""} ${styles[phaseKey] ?? ""} ${isActive ? styles.isActive : " "}`}>
      <SlideTypeGraphicSvg slideType={slide.kind} />
    </div>
  );
};

export { SessionRoundThumbnail };
