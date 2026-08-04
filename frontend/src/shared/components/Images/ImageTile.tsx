import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/solid";
import React from "react";
import { IconBtn } from "../UIElements/Buttons/IconBtn";
import { AppImg } from "./AppImg";
import styles from "./ImageTile.module.css";

interface ImageTileProps {
  imgUrl: string | null;
  altText?: string;
  onPick?: () => void;
  onClear?: () => void;
  onlyVisual?: boolean;
}

const ImageTile: React.FC<ImageTileProps> = ({ imgUrl, altText, onPick, onClear, onlyVisual }) => {
  return (
    <div className={styles.thumbWrap}>
      <button
        type="button"
        className={styles.imageTile}
        onClick={onPick}
        aria-label="Pick cover image"
      >
        {imgUrl ? (
          <AppImg src={imgUrl} alt={altText} />
        ) : (
          <div className={styles.imageTileEmpty}>
            <PhotoIcon aria-hidden="true" />
          </div>
        )}
      </button>
      {imgUrl && !onlyVisual && (
        <IconBtn
          fill="ghost"
          size="xs"
          className={styles.imageClear}
          icon={<XMarkIcon />}
          aria-label="Clear cover image"
          onClick={onClear}
        />
      )}
    </div>
  );
};

export { ImageTile };
