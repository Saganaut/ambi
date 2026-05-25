// Public marketing page for subscription plans. Composes the Pricing/* family
// of components: a BillingToggle drives the displayed price, a PricingGrid
// lays out PricingCard instances for each tier, and the whole page is fed by
// usePricingPage so swapping placeholder data for a billing API later is a
// one-place change.
import { BillingToggle } from "../../components/Pricing/BillingToggle/BillingToggle";
import { PricingCard } from "../../components/Pricing/PricingCard/PricingCard";
import { PricingGrid } from "../../components/Pricing/PricingGrid/PricingGrid";
import styles from "./PricingPage.module.css";
import { usePricingPage } from "./usePricingPage";

const PricingPage = () => {
  const { cycle, setCycle, tiers, annualSavingsLabel } = usePricingPage();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>pricing</p>
        <h1 className={styles.title}>Choose your plan</h1>
        <p className={styles.subtitle}>
          Start free, upgrade when you&apos;re ready. Every plan unlocks more
          ways to compete, create, and climb the leaderboard.
        </p>
        <div className={styles.toggleRow}>
          <BillingToggle
            value={cycle}
            onChange={setCycle}
            options={[
              { value: "monthly", label: "Monthly" },
              {
                value: "annual",
                label: "Annual",
                savingsLabel: annualSavingsLabel,
              },
            ]}
          />
        </div>
      </header>

      <section className={styles.gridWrap} aria-label='Subscription plans'>
        <PricingGrid columns={3}>
          {tiers.map((tier) => (
            <PricingCard
              key={tier.key}
              name={tier.name}
              tagline={tier.tagline}
              price={tier.displayPrice}
              priceUnit={tier.displayUnit}
              features={tier.features}
              ctaLabel={tier.ctaLabel}
              ctaTo={tier.ctaTo}
              featured={tier.featured}
              badge={tier.badge}
              footnote={tier.footnote}
            />
          ))}
        </PricingGrid>
      </section>

      <section className={styles.faq}>
        <h2 className={styles.faqTitle}>Questions about pricing?</h2>
        <p className={styles.faqBody}>
          Detailed plan comparisons, team seat management, and billing options
          are coming soon. In the meantime, reach out and we&apos;ll get you set
          up.
        </p>
      </section>
    </main>
  );
};

export { PricingPage };
