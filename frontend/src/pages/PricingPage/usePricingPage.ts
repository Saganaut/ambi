// Page-level hook that owns the billing cycle selection and maps the static
// tier data into the props PricingCard expects. Keeping this as a hook makes
// it cheap to swap PRICING_TIERS for an RTK Query call against a future
// /api/billing/plans endpoint without changing the page component.
import { useState } from "react";
import { PRICING_TIERS, type PricingTier } from "./data";
import type { BillingCycle } from "@pages/PricingPage/components/BillingToggle/BillingToggle";

interface ResolvedTier extends PricingTier {
  displayPrice: string;
  displayUnit?: string;
}

interface UsePricingPageResult {
  cycle: BillingCycle;
  setCycle: (next: BillingCycle) => void;
  tiers: ResolvedTier[];
  annualSavingsLabel?: string;
}

const usePricingPage = (): UsePricingPageResult => {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  const tiers: ResolvedTier[] = PRICING_TIERS.map((tier) => {
    const priced = tier.prices[cycle];
    return {
      ...tier,
      displayPrice: priced.amount,
      displayUnit: priced.unit,
    };
  });

  const annualSavingsLabel = PRICING_TIERS.map(
    (tier) => tier.prices.annual.savings,
  ).find((s) => s != null);

  return { cycle, setCycle, tiers, annualSavingsLabel };
};

export { usePricingPage };
export type { ResolvedTier };
