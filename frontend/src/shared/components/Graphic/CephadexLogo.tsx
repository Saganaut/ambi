import CephadexLogoSvg from "@assets/images/brand/cephadex-logo.svg?react";
import styles from "./Graphic.module.css";

interface CephadexLogoProps {
  size?: "sm" | "md" | "lg";
}

const CephadexLogo = ({ size = "md" }: CephadexLogoProps) => {
  return (
    <CephadexLogoSvg
      aria-hidden='true'
      focusable='false'
      className={[styles.cephadexLogo, styles[size]].join(" ")}
    />
  );
};

export { CephadexLogo };
