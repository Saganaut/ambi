// Drop-in <img> for gallery/S3-backed sources: a missing URL or a load error
// (e.g. a deleted image's presigned URL 404ing) renders the DS placeholder
// panel instead of the browser's broken-image glyph. A changed src (presigned
// URLs refresh periodically) or a remount retries the real image.
import { useState, type ImgHTMLAttributes } from "react";
import { placeholderImageUrl } from "@utils/image";

interface AppImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> {
  src: string | null | undefined;
  /** Stable tint seed for the fallback panel — pass the owning item's id. */
  fallbackSeed?: string;
}

const AppImg = ({ src, alt = "", fallbackSeed, ...imgProps }: AppImgProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const hasSrc = typeof src === "string" && src.trim() !== "";
  if (!hasSrc || failedSrc === src) {
    const fallbackAlt = alt.trim() === "" ? "" : `${alt} (image unavailable)`;
    return (
      <img
        {...imgProps}
        src={placeholderImageUrl(fallbackSeed ?? src ?? "")}
        alt={fallbackAlt}
        data-image-fallback=''
      />
    );
  }
  return (
    <img
      {...imgProps}
      src={src}
      alt={alt}
      onError={() => {
        setFailedSrc(src);
      }}
    />
  );
};

export { AppImg };
export type { AppImgProps };
