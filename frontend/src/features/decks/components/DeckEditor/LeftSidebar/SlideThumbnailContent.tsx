import React from "react";
import styles from "./LeftSidebarContent.module.css";
import { RichTextDisplay } from "@components/Forms/Input/RichTextDisplay/RichTextDisplay";
import { SlideTypeGraphicSvg } from "../../Slides/SlideTypeGraphics/SlideTypeGraphic";
import { ElementKind, ElementKind } from "../RightSidebar/data";
interface SlideThumbnailContentProps {
  slideType?: ElementKind;
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
          <SlideTypeGraphicSvg kind={slideType} />
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
