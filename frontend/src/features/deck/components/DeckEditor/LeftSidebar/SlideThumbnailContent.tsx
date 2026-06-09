import React from "react";
import styles from "./LeftSidebarContent.module.css";
import { RichTextDisplay } from "@components/Forms/Input/RichTextDisplay/RichTextDisplay";
import { SlideTypeGraphicSvg } from "../../Slides/SlideTypeGraphics/SlideTypeGraphic";
import { SlideType } from "@deck/store/deckEnums.gen";
interface SlideThumbnailContentProps {
  slideType?: SlideType;
  title: string;
}

const SlideThumbnailContent: React.FC<SlideThumbnailContentProps> = ({
  slideType,
  title,
}) => {
  return (
    <div className={styles.slideThumbnailContent}>
      <div className={styles.topRow}>
        {slideType ? (
          <SlideTypeGraphicSvg slideType={slideType} />
        ) : (
          "Error. No graphic"
        )}
      </div>

      <div className={styles.bottomRow}>
        {" "}
        <RichTextDisplay value={title} maxLength={20} styled={false} />
      </div>
    </div>
  );
};

export { SlideThumbnailContent };
