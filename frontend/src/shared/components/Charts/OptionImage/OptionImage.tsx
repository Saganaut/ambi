// An option's uploaded image as charts render it (from the SM asset the MCQ
// adapter resolves onto ChartDatum.imageUrl). Renders nothing when the option
// has no image. Every variant keeps the image's intrinsic aspect ratio and
// fits what it can within its slot:
//   - "thumb"         beside the option label (legend rows, axis labels)
//   - "barHorizontal" inside a horizontal bar, flush with its left (axis) end
//   - "barVertical"   inside a vertical column, resting on the axis at its
//                     base — anchored to the track, not the fill, so it stays
//                     visible even when a low value makes the fill shorter
//                     than the image
import styles from "./OptionImage.module.css";

interface OptionImageProps {
  src?: string;
  alt?: string;
  variant?: "thumb" | "barHorizontal" | "barVertical";
}

const OptionImage = ({ src, alt, variant = "thumb" }: OptionImageProps) => {
  if (src == null) return null;
  return (
    <img
      className={`${styles.image} ${styles[variant]}`}
      src={src}
      alt={alt ?? ""}
      loading="lazy"
      draggable={false}
    />
  );
};

export { OptionImage };
