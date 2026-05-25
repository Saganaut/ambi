import type { ElementKind } from "@/components/Common/Slides/SlideTypeGraphics/slideTypeGraphics";
import React from "react";
import styles from "./LeftSidebarContent.module.css";
import { SlideTypeGraphicSvg } from "@/components/Common/Slides/SlideTypeGraphics/SlideTypeGraphic";
import { RichTextDisplay } from "@/components/Common/Input/RichTextDisplay/RichTextDisplay";
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
