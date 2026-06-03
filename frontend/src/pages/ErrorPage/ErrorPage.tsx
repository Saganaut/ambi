import { type ComponentType, type ReactNode, type SVGProps } from "react";
import { Link } from "@tanstack/react-router";
import styles from "./ErrorPage.module.css";
import LostFish from "@assets/images/mascots/lost-fish.svg?react";
import SleepyCeph from "@assets/images/mascots/sleepy-ceph.svg?react";
import OceanFloor from "@assets/images/mascots/ocean-floor.svg?react";
import { Btn } from "@common/Buttons/Btn";

interface ErrorPageProps {
  statusCode: number;
  title: string;
  message: string;
  image?: ReactNode;
}

type MascotComponent = ComponentType<SVGProps<SVGSVGElement>>;

const ERROR_CONFIGS: Record<
  number,
  { title: string; message: string; Mascot: MascotComponent }
> = {
  404: {
    title: "Page not found",
    message: "Looks like this corner of Ambi doesn't exist.",
    Mascot: OceanFloor,
  },
  500: {
    title: "Internal server error",
    message: "Something broke on our end.  Give it a moment and try again.",
    Mascot: SleepyCeph,
  },
  503: {
    title: "Service unavailable",
    message: "Ambi is taking a quick breather.",
    Mascot: LostFish,
  },
};

const ErrorPage = ({ statusCode, title, message, image }: ErrorPageProps) => {
  const Mascot = ERROR_CONFIGS[statusCode].Mascot;
  return (
    <main className={styles.page}>
      <p className={styles.code}>{statusCode}</p>
      <div className={styles.mascot}>
        {image ?? (
          <Mascot
            className={styles.mascotSvg}
            role='img'
            aria-label='Error illustration'
          />
        )}
      </div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
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
      </div>
    </main>
  );
};

export function NotFoundPage() {
  const cfg = ERROR_CONFIGS[404];
  return <ErrorPage statusCode={404} title={cfg.title} message={cfg.message} />;
}

export function ServerErrorPage() {
  const cfg = ERROR_CONFIGS[500];
  return <ErrorPage statusCode={500} title={cfg.title} message={cfg.message} />;
}

export function ServiceUnavailablePage() {
  const cfg = ERROR_CONFIGS[503];
  return <ErrorPage statusCode={503} title={cfg.title} message={cfg.message} />;
}

export { ErrorPage };
