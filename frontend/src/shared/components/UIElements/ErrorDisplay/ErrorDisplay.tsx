// Centered error illustration block: a big status code, a mascot (or custom
// image), a title, a message, and an action row. Layout-agnostic so callers
// can drop it into a full-page <main> or a smaller inline slot. Sizing is
// driven entirely by the `size` prop via CSS custom properties.
import { type ComponentType, type ReactNode, type SVGProps } from "react";
import { Link } from "@tanstack/react-router";
import { Btn } from "@ui/Buttons/Btn";
import styles from "./ErrorDisplay.module.css";

type MascotComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface ErrorDisplayProps {
  /** Large status number shown above the mascot (e.g. 404). Hidden when omitted. */
  statusCode?: number;
  title: string;
  message: string;
  /** SVG mascot to render. Ignored when `image` is provided. */
  mascot?: MascotComponent;
  /** Custom illustration node; overrides `mascot` when set. */
  image?: ReactNode;
  /** Action row; defaults to "Take me home" + "Go back". Pass `null` to hide. */
  actions?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const DefaultActions = () => (
  <>
    <Link to='/' className={styles.homeLink} viewTransition>
      Take me home
    </Link>
    <Btn
      className={styles.backBtn}
      onClick={() => {
        history.back();
      }}>
      Go back
    </Btn>
  </>
);

const ErrorDisplay = ({
  statusCode,
  title,
  message,
  mascot: Mascot,
  image,
  actions,
  size = "md",
  className,
}: ErrorDisplayProps) => (
  <div
    className={[styles.root, styles[size], className].filter(Boolean).join(" ")}
    role='alert'>
    {statusCode !== undefined && <p className={styles.code}>{statusCode}</p>}
    {(image || Mascot) && (
      <div className={styles.mascot}>
        {image ??
          (Mascot && (
            <Mascot
              className={styles.mascotSvg}
              role='img'
              aria-label='Error illustration'
            />
          ))}
      </div>
    )}
    <h1 className={styles.title}>{title}</h1>
    <p className={styles.message}>{message}</p>
    {actions !== null && (
      <div className={styles.actions}>{actions ?? <DefaultActions />}</div>
    )}
  </div>
);

export { ErrorDisplay };
export type { ErrorDisplayProps, MascotComponent };
