/**
 * Pure data plumbing + formatters extracted from DeckAnalyticsPage.
 *
 * The deck analytics dashboard reads two backend payloads — the live deck
 * (for question titles and option labels) and a {@code DeckAnalytics} rollup
 * (presented/answered/correct counts + a discriminated distribution map per
 * element) — and joins them at render time. The joining and label-lookup
 * logic lives here so the page + per-element components stay JSX-only.
 *
 * Element-kind classification (sum-style vs count-style vs no-distribution)
 * is part of the join: sum-style kinds (Allocation/Scales/Ranking) divide
 * the bucket value by answeredCount to surface an average; everything else
 * displays the raw bucket count. Drawing + Q&A skip the distribution chart
 * entirely (their submissions live on the session record, not the rollup).
 */
import type {
  DeckAnalytics,
  DeckResponse,
  ElementStats,
} from "@/store/AmbiApi";
import type { DistributionRow } from "@common/Analytics";

type DeckElement = NonNullable<DeckResponse["elements"]>[number];
type ElementKind = DeckElement["kind"];

interface ElementRow {
  elementId: string;
  element: DeckElement | undefined;
  stats: ElementStats;
}

type Segment = "ALL" | "GAMES" | "PRESENTATIONS";

const SEGMENT_LABELS: Record<Segment, string> = {
  ALL: "All",
  GAMES: "Games",
  PRESENTATIONS: "Presentations",
};

const SUM_STYLE_KINDS: ReadonlySet<ElementKind> = new Set<ElementKind>([
  "AllocationQuestion",
  "ScalesQuestion",
  "RankingQuestion",
]);

const NO_DISTRIBUTION_KINDS: ReadonlySet<ElementKind> = new Set<ElementKind>([
  "DrawingQuestion",
  "QAndAQuestion",
]);

const KIND_BADGE_LABEL: Record<ElementKind, string> = {
  Slide: "Slide",
  McqQuestion: "MCQ",
  TextQuestion: "Text",
  NumberQuestion: "Number",
  RankingQuestion: "Ranking",
  ScalesQuestion: "Scales",
  QAndAQuestion: "Q & A",
  GridQuestion: "Grid",
  PlaceOnImageQuestion: "Place on image",
  WordCloudQuestion: "Word cloud",
  AllocationQuestion: "Allocation",
  MatchingQuestion: "Matching",
  DrawingQuestion: "Drawing",
};

const isSumStyle = (kind: ElementKind | undefined) =>
  kind ? SUM_STYLE_KINDS.has(kind) : false;

const isNoDistribution = (kind: ElementKind | undefined) =>
  kind ? NO_DISTRIBUTION_KINDS.has(kind) : false;

/**
 * Live deck order first (slides excluded — they don't collect responses),
 * then orphan analytics rows that no longer match any element (renamed,
 * deleted, …). The orphan tail keeps CSV exports honest.
 */
const buildOrderedElements = (
  deck: DeckResponse | undefined,
  analytics: DeckAnalytics | undefined,
): ElementRow[] => {
  const perElement = analytics?.perElement ?? {};
  const rows: ElementRow[] = [];
  const seen = new Set<string>();

  for (const element of deck?.elements ?? []) {
    if (!element.id) continue;
    if (element.kind === "Slide") continue;
    const stats = perElement[element.id];
    // TS treats the perElement index signature as total, but the rollup only
    // carries elements that have been presented in a finished session.

    if (!stats) continue;
    rows.push({ elementId: element.id, element, stats });
    seen.add(element.id);
  }

  for (const [elementId, stats] of Object.entries(perElement)) {
    if (seen.has(elementId)) continue;
    rows.push({ elementId, element: undefined, stats });
  }

  return rows;
};

/**
 * Converts the {@code distribution} map to the row shape consumed by
 * {@link DistributionList}. Average-style kinds get divided by
 * answeredCount; everything else stays a raw count. Rows are pre-sorted
 * descending so the longest bar always sits on top.
 */
const buildDistributionRows = (
  element: DeckElement | undefined,
  stats: ElementStats,
): DistributionRow[] => {
  const dist = stats.distribution ?? {};
  const entries = Object.entries(dist);
  if (entries.length === 0) return [];

  const kind = element?.kind;
  const labelByKey = buildLabelLookup(element);
  const answeredCount = stats.answeredCount ?? 0;
  const sumStyle = isSumStyle(kind);

  const rows: DistributionRow[] = entries.map(([key, raw]) => {
    const value = sumStyle && answeredCount > 0 ? raw / answeredCount : raw;
    const display = sumStyle ? value.toFixed(1) : value.toLocaleString();
    return {
      key,
      label: labelByKey[key] ?? key,
      value,
      display,
    };
  });
  rows.sort((a, b) => b.value - a.value);
  return rows;
};

/**
 * Maps the opaque ids inside a distribution map to the human-readable label
 * the author saw in the editor. Matching uses a Proxy because its keys are
 * "leftId>rightId" composites the static lookup can't represent directly.
 */
const buildLabelLookup = (
  element: DeckElement | undefined,
): Record<string, string> => {
  if (!element) return {};
  const out: Record<string, string> = {};
  switch (element.kind) {
    case "McqQuestion":
    case "AllocationQuestion":
      for (const opt of element.options ?? []) {
        if (opt.id) out[opt.id] = opt.text ?? opt.id;
      }
      return out;
    case "RankingQuestion":
      for (const item of element.items ?? []) {
        if (item.id) out[item.id] = item.label ?? item.id;
      }
      return out;
    case "ScalesQuestion":
      for (const s of element.statements ?? []) {
        if (s.id) out[s.id] = s.text ?? s.id;
      }
      return out;
    case "MatchingQuestion": {
      const leftById: Record<string, string> = {};
      const rightById: Record<string, string> = {};
      for (const pair of element.pairs ?? []) {
        if (pair.id) {
          if (pair.leftLabel) leftById[pair.id] = pair.leftLabel;
          if (pair.rightLabel) rightById[pair.id] = pair.rightLabel;
        }
      }
      const target: Record<string, string> = {};
      return new Proxy(target, {
        get(_t, prop) {
          if (typeof prop !== "string") return undefined;
          const arrow = prop.indexOf(">");
          if (arrow < 0) return undefined;
          const left = prop.slice(0, arrow);
          const right = prop.slice(arrow + 1);
          const leftLabel = leftById[left] ?? left;
          const rightLabel = rightById[right] ?? right;
          return `${leftLabel} → ${rightLabel}`;
        },
      });
    }
    default:
      // Number/Text/WordCloud/Grid/PlaceOnImage — keys are already legible.
      // Slide/Drawing/Q&A never reach here.
      return out;
  }
};

const formatDuration = (ms: number): string => {
  if (!ms || ms <= 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
};

const formatRelativeDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const formatPercent = (frac: number, digits = 1): string =>
  `${(frac * 100).toFixed(digits)}%`;

export {
  buildOrderedElements,
  buildDistributionRows,
  buildLabelLookup,
  formatDuration,
  formatRelativeDate,
  formatPercent,
  isSumStyle,
  isNoDistribution,
  KIND_BADGE_LABEL,
  SEGMENT_LABELS,
};
export type { ElementRow, Segment, DeckElement, ElementKind };
