// Single subscription tier card. Composes FeatureList for capabilities and a
// CTA that can render as either a router Link (internal) or an anchor
// (external). One `featured` variant lifts the card visually for the
// recommended tier. Content is intentionally fully prop-driven so the same
// component can render placeholder copy today and Stripe-backed plans later.
import { Link } from "@tanstack/react-router";
import { Btn } from "../../Common/Buttons/Btn";
import { FeatureList, type FeatureItem } from "../FeatureList/FeatureList";
import styles from "./PricingCard.module.css";

interface PricingCardProps {
  name: string;
  tagline: string;
  price: string;
  priceUnit?: string;
  features: FeatureItem[];
  ctaLabel: string;
  ctaTo?: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  featured?: boolean;
  badge?: string;
  footnote?: string;
}

const PricingCard = ({
  name,
  tagline,
  price,
  priceUnit,
  features,
  ctaLabel,
  ctaTo,
  ctaHref,
  ctaOnClick,
  featured = false,
  badge,
  footnote,
}: PricingCardProps) => {
  const className = [styles.card, featured ? styles.featured : ""]
    .filter(Boolean)
    .join(" ");

  let cta;
  if (ctaTo != null) {
    cta = (
      <Link to={ctaTo} className={styles.cta} viewTransition>
        {ctaLabel}
      </Link>
    );
  } else if (ctaHref != null) {
    cta = (
      <a
        href={ctaHref}
        className={styles.cta}
        target='_blank'
        rel='noopener noreferrer'>
        {ctaLabel}
      </a>
    );
  } else {
    cta = (
      <Btn className={styles.cta} onClick={ctaOnClick}>
        {ctaLabel}
      </Btn>
    );
  }

  return (
    <article className={className} aria-label={`${name} plan`}>
      {badge != null && <span className={styles.badge}>{badge}</span>}
      <header className={styles.header}>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.tagline}>{tagline}</p>
      </header>
      <div className={styles.priceRow}>
        <span className={styles.price}>{price}</span>
        {priceUnit != null && (
          <span className={styles.priceUnit}>{priceUnit}</span>
        )}
      </div>
      <div className={styles.featuresWrap}>
        <FeatureList items={features} />
      </div>
      <footer className={styles.footer}>
        {cta}
        {footnote != null && <p className={styles.note}>{footnote}</p>}
      </footer>
    </article>
  );
};

export { PricingCard };
export type { PricingCardProps };
