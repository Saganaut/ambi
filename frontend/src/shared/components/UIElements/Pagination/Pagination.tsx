// Reusable pager for any paginated list. Two flows:
//   1. Known total — pass `pageCount`. Renders `< 1 ... 4 5 6 ... 12 >` with
//      ellipsis collapse around the active page (or a flat range when the
//      total is small). Honours `compact` to suppress the page numbers.
//   2. Unknown total — pass `hasMore` instead of `pageCount`. Renders
//      prev/next chevrons plus a "Page X" label. The next chevron is disabled
//      when `hasMore` is false; prev is disabled at page 0.
// Keyboard left/right move between pages while focus is inside the nav.
// Caller owns the page state and gets the next zero-indexed page via
// `onPageChange`.
import { type KeyboardEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { IconBtn } from "@ui/Buttons/IconBtn";
import styles from "./Pagination.module.css";

interface PaginationBaseProps {
  page: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  boundaryCount?: number;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

interface KnownTotalProps extends PaginationBaseProps {
  pageCount: number;
  hasMore?: never;
  compact?: boolean;
}

interface UnknownTotalProps extends PaginationBaseProps {
  pageCount?: undefined;
  hasMore: boolean;
  compact?: never;
}

type PaginationProps = KnownTotalProps | UnknownTotalProps;

type PageToken = number | "ellipsis-start" | "ellipsis-end";

const Pagination = (props: PaginationProps) => {
  const {
    page,
    onPageChange,
    siblingCount = 1,
    boundaryCount = 1,
    disabled = false,
    ariaLabel = "Pagination",
    className,
  } = props;

  const knownTotal = props.pageCount != null;
  const pageCount = knownTotal ? props.pageCount : Infinity;
  const compact = knownTotal ? (props.compact ?? false) : true;

  if (knownTotal && pageCount <= 1) return null;

  const clampedPage = knownTotal
    ? Math.max(0, Math.min(page, pageCount - 1))
    : Math.max(0, page);
  const canGoPrev = !disabled && clampedPage > 0;
  const canGoNext =
    !disabled && (knownTotal ? clampedPage < pageCount - 1 : props.hasMore);

  const goTo = (next: number) => {
    if (disabled) return;
    const bounded = knownTotal
      ? Math.max(0, Math.min(next, pageCount - 1))
      : Math.max(0, next);
    if (bounded !== clampedPage) onPageChange(bounded);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(clampedPage - 1);
    } else if (e.key === "ArrowRight") {
      if (!canGoNext) return;
      e.preventDefault();
      goTo(clampedPage + 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      goTo(0);
    } else if (e.key === "End" && knownTotal) {
      e.preventDefault();
      goTo(pageCount - 1);
    }
  };

  return (
    <nav
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={[styles.pagination, compact ? styles.compact : null, className]
        .filter(Boolean)
        .join(" ")}>
      <IconBtn
        variant='secondary'
        size='sm'
        className={styles.navBtn}
        icon={<ChevronLeftIcon className={styles.chevron} />}
        disabled={!canGoPrev}
        onClick={() => {
          goTo(clampedPage - 1);
        }}
        aria-label='Previous page'
      />

      {compact ? (
        <span className={styles.compactLabel} aria-live='polite'>
          {knownTotal
            ? `Page ${String(clampedPage + 1)} of ${String(pageCount)}`
            : `Page ${String(clampedPage + 1)}`}
        </span>
      ) : (
        <ol className={styles.list}>
          {buildPages({
            page: clampedPage,
            pageCount,
            siblingCount,
            boundaryCount,
          }).map((token, idx) => (
            <li
              key={
                typeof token === "number"
                  ? `p-${String(token)}`
                  : `${token}-${String(idx)}`
              }
              className={styles.item}>
              {typeof token === "number" ? (
                <button
                  type='button'
                  className={[
                    styles.pageBtn,
                    token === clampedPage ? styles.current : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={token === clampedPage ? "page" : undefined}
                  aria-label={`Go to page ${String(token + 1)}`}
                  disabled={disabled}
                  onClick={() => {
                    goTo(token);
                  }}>
                  {token + 1}
                </button>
              ) : (
                <span className={styles.ellipsis} aria-hidden='true'>
                  …
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      <IconBtn
        variant='secondary'
        size='sm'
        className={styles.navBtn}
        icon={<ChevronRightIcon className={styles.chevron} />}
        disabled={!canGoNext}
        onClick={() => {
          goTo(clampedPage + 1);
        }}
        aria-label='Next page'
      />
    </nav>
  );
};

interface BuildPagesArgs {
  page: number;
  pageCount: number;
  siblingCount: number;
  boundaryCount: number;
}

// Returns the page index strip with ellipsis tokens. All page values are
// zero-indexed; the component renders them as 1-indexed labels.
const buildPages = ({
  page,
  pageCount,
  siblingCount,
  boundaryCount,
}: BuildPagesArgs): PageToken[] => {
  const range = (start: number, end: number) =>
    Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);

  const totalSlots = boundaryCount * 2 + siblingCount * 2 + 3;
  if (pageCount <= totalSlots) {
    return range(0, pageCount - 1);
  }

  const startBoundary = range(0, boundaryCount - 1);
  const endBoundary = range(pageCount - boundaryCount, pageCount - 1);

  const siblingStart = Math.max(
    boundaryCount,
    Math.min(
      page - siblingCount,
      pageCount - boundaryCount - siblingCount * 2 - 1,
    ),
  );
  const siblingEnd = Math.min(
    pageCount - boundaryCount - 1,
    Math.max(page + siblingCount, boundaryCount + siblingCount * 2),
  );

  const tokens: PageToken[] = [...startBoundary];

  if (siblingStart > boundaryCount) {
    tokens.push("ellipsis-start");
  }

  tokens.push(...range(siblingStart, siblingEnd));

  if (siblingEnd < pageCount - boundaryCount - 1) {
    tokens.push("ellipsis-end");
  }

  tokens.push(...endBoundary);

  // De-dupe in case boundary and sibling ranges overlap on a small pageCount
  // edge that slipped past the totalSlots short-circuit.
  const seen = new Set<number>();
  return tokens.filter((t) => {
    if (typeof t !== "number") return true;
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
};

export { Pagination };
