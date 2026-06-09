/**
 * Layout shell shared by every kind-specific slide editor. Centralises the
 * vertical rhythm (header / scrollable body / footer slot) so each editor only
 * has to render its fields and the chrome stays identical across kinds.
 *
 * Slots:
 *   - `title` and `description` — small text block at the top of the editor.
 *   - children — the editor's fields (flex column with `--space-4` gap).
 *   - `footer` — warnings / help text pinned below the scrollable body.
 */
import type { ReactNode } from "react";
import styles from "./SlideContentTypes.module.css";

interface SlideContentWrapperProps {
  title?: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}

const SlideContentWrapper = ({
  title,
  description,
  footer,
  children,
}: SlideContentWrapperProps) => {
  return (
    <div className={styles.editorShell}>
      {(title ?? description) && (
        <header className={styles.editorHeader}>
          {title && <h3 className={styles.editorTitle}>{title}</h3>}
          {description && (
            <p className={styles.editorDescription}>{description}</p>
          )}
        </header>
      )}
      <div className={styles.editorBody}>{children}</div>
      {footer && <footer className={styles.editorFooter}>{footer}</footer>}
    </div>
  );
};

export { SlideContentWrapper };
