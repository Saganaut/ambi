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
import styles from "./SlideContentWrapper.module.css";

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
    <div className={styles.shell}>
      {(title ?? description) && (
        <header className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {description && (
            <p className={styles.description}>{description}</p>
          )}
        </header>
      )}
      <div className={styles.body}>{children}</div>
      {footer && <footer className={styles.footer}>{footer}</footer>


      }
      <div></div>
    </div>
  );
};

export { SlideContentWrapper };
