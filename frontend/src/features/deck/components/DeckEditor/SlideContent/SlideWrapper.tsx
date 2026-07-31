/**
 * Layout shell shared by every kind-specific slide editor. Centralises the
 * vertical rhythm (header / scrollable body / footer slot) so each editor only
 * has to render its fields and the chrome stays identical across kinds.
 *
 * Slots:
 *   - `title` and `description` — small text block at the top of the editor.
 *   - `prompt` — the big rich-text question editor at the top of the body. Owned
 *     here (rather than repeated per content type) so its contrast glow can be
 *     driven centrally: it lights up only when the canvas has a background image
 *     (see {@link useSlideCanvas}), keeping the prompt legible over a busy image.
 *   - children — the editor's fields (flex column with `--space-4` gap).
 *   - `footer` — warnings / help text pinned below the scrollable body.
 */
import { useSlideCanvas } from "@deck/contexts/useSlideCanvas";
import type { ReactNode } from "react";
import { ImageSlot } from "../../ImageSlot";
import { PromptField, type PromptFieldProps } from "./_shared";
import styles from "./SlideWrapper.module.css";

interface SlideWrapperProps {
  title?: string;
  description?: string;
  /** Prompt-editor wiring. `showContrastPlate` is owned by the wrapper (driven by
   *  the canvas background), so editors don't pass it. */
  prompt?: Omit<PromptFieldProps, "showContrastPlate">;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

const SlideWrapper = ({
  title,
  description,
  prompt,
  footer,
  children,
  className,
}: SlideWrapperProps) => {
  const { hasBackgroundImage } = useSlideCanvas();
  return (
    <div className={`${styles.shell} ${className}`}>
      {(title ?? description) && (
        <header
          className={[styles.header, hasBackgroundImage && styles.overImage]
            .filter(Boolean)
            .join(" ")}
        >
          {title && <h3 className={styles.title}>{title}</h3>}
          {description && <p className={styles.description}>{description}</p>}
        </header>
      )}
      <div className={styles.body}>
        <ImageSlot
          slotId={{
            start: 2,
            end: 3,
            top: 2,
            bottom: 3,
          }}
        />
        <div className={styles.innerBody}>
          {prompt && <PromptField {...prompt} showContrastPlate={hasBackgroundImage} />}
          {children}
        </div>
        <ImageSlot
          slotId={{
            start: 5,
            end: 8,
            top: 2,
            bottom: 3,
          }}
        />
      </div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </div>
  );
};

export { SlideWrapper };
