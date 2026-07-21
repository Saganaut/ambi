// Coarse "time ago" phrasing for UI metadata lines ("2 hours ago",
// "yesterday"). Wraps Intl.RelativeTimeFormat so wording stays consistent and
// pluralization is handled for us. `now` is injectable for deterministic tests.

interface Division {
  amount: number;
  unit: Intl.RelativeTimeFormatUnit;
}

// Each entry is how many of the current unit make up the next one; delta is
// divided down until it fits inside the current unit.
const DIVISIONS: Division[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const formatRelativeTime = (
  timestamp: string | Date,
  now: Date = new Date(),
): string => {
  let delta = (new Date(timestamp).getTime() - now.getTime()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(delta) < division.amount) {
      return formatter.format(Math.round(delta), division.unit);
    }
    delta /= division.amount;
  }
  return formatter.format(Math.round(delta), "year");
};

export { formatRelativeTime };
