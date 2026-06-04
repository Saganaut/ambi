import { type ReactNode } from "react";
import styles from "./ErrorPage.module.css";
import LostFish from "@assets/images/mascots/lost-fish.svg?react";
import SleepyCeph from "@assets/images/mascots/sleepy-ceph.svg?react";
import OceanFloor from "@assets/images/mascots/ocean-floor.svg?react";
import {
  ErrorDisplay,
  type MascotComponent,
} from "@ui/ErrorDisplay/ErrorDisplay";

interface ErrorPageProps {
  statusCode: number;
  title: string;
  message: string;
  image?: ReactNode;
}

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

const ErrorPage = ({ statusCode, title, message, image }: ErrorPageProps) => (
  <main className={styles.page}>
    <ErrorDisplay
      statusCode={statusCode}
      title={title}
      message={message}
      mascot={ERROR_CONFIGS[statusCode]?.Mascot}
      image={image}
    />
  </main>
);

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
