// Placeholder pricing copy. Real pricing/feature lists will be filled in once
// product decisions land and the Stripe integration provides authoritative
// price IDs. The shape here intentionally mirrors what a future Plan API
// response is expected to look like (key + price-per-cycle + features), so
// swapping placeholder data for live data is a one-line change in the hook.
import type { FeatureItem } from "../../components/Pricing/FeatureList/FeatureList";

interface PricingTier {
  key: "free" | "individual" | "organization";
  name: string;
  tagline: string;
  prices: {
    monthly: { amount: string; unit?: string };
    annual: { amount: string; unit?: string; savings?: string };
  };
  features: FeatureItem[];
  ctaLabel: string;
  ctaTo?: string;
  featured?: boolean;
  badge?: string;
  footnote?: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    key: "free",
    name: "Free",
    tagline: "Get a feel for Ambi with the essentials.",
    prices: {
      monthly: { amount: "$0", unit: "forever" },
      annual: { amount: "$0", unit: "forever" },
    },
    features: [
      { label: "Play all public games" },
      { label: "Track your stats and streaks" },
      { label: "Join the global leaderboard" },
      { label: "Create custom decks", included: false },
      { label: "Host private matches", included: false },
    ],
    ctaLabel: "Get started",
    ctaTo: "/register",
    footnote: "No credit card required.",
  },
  {
    key: "individual",
    name: "Pro",
    tagline: "Unlock the full single-player experience.",
    prices: {
      monthly: { amount: "$8", unit: "/ month" },
      annual: { amount: "$72", unit: "/ year", savings: "Save 25%" },
    },
    features: [
      { label: "Everything in Free" },
      { label: "Create unlimited custom decks" },
      { label: "Private matches with friends" },
      { label: "Advanced stats and history" },
      { label: "Themes and customization" },
    ],
    ctaLabel: "Upgrade to Pro",
    ctaTo: "/register",
    featured: true,
    badge: "Most popular",
    footnote: "Cancel anytime.",
  },
  {
    key: "organization",
    name: "Team",
    tagline: "Seats for your team, club, or classroom.",
    prices: {
      monthly: { amount: "$6", unit: "/ seat / month" },
      annual: { amount: "$60", unit: "/ seat / year", savings: "Save 17%" },
    },
    features: [
      { label: "Everything in Pro for every seat" },
      { label: "Shared organization workspace" },
      { label: "Centralized billing and seat management" },
      { label: "Organization-wide themes and branding" },
      { label: "Priority support" },
    ],
    ctaLabel: "Talk to sales",
    ctaTo: "/about",
    footnote: "Minimum 3 seats. Volume discounts available.",
  },
];

export { PRICING_TIERS };
export type { PricingTier };
