/**
 * Rich text display — read-only counterpart to RichTextInput. Takes the HTML
 * string the editor produces and renders it.
 *
 * `styled` (default true) preserves TipTap's marks (bold / strike / underline
 * / links) and the inline spans for color and font-size. Set to false to
 * strip every tag and inline style and render only the text content, with
 * block boundaries (paragraphs, list items, headings, <br>) preserved as
 * newlines.
 *
 * The HTML nominally originates from RichTextInput (TipTap), but the stored
 * `body` is a plain string on the wire — seed data, a direct API write, an
 * imported deck, or a `javascript:` href could carry markup outside the
 * editor's schema. We therefore sanitize with DOMPurify at this boundary
 * before injecting via `dangerouslySetInnerHTML`, so no script, event handler,
 * or unsafe URL scheme can ever reach the DOM regardless of the source. See
 * `sanitizeRichText` for the allowlist (which mirrors the TipTap schema).
 */
import { sanitizeRichText } from "@utils/sanitizeHtml";
import { truncateText } from "@utils/utils";
import { useMemo } from "react";
import { ErrorFallback } from "@ui/BoundaryFallbacks/ErrorFallback";
import { ErrorBoundary } from "@ui/ErrorBoundary/ErrorBoundary";
import styles from "./RichTextDisplay.module.css";

interface RichTextDisplayProps {
  value: string;
  /** When false, every tag and inline style is dropped and the text content
   *  is rendered with block boundaries preserved as newlines. Defaults to true. */
  styled?: boolean;
  /** If set, the rendered content is truncated to this many characters of
   *  visible text (tags don't count) with an ellipsis appended. */
  maxLength?: number;
  /** Wrapper element to render. Defaults to a `div`; pass a heading (`h1`–`h6`)
   *  when the rich text is a title so it keeps a place in the document outline
   *  for assistive tech. The sanitized HTML is still injected internally. */
  as?: React.ElementType;
  className?: string;
}

// Block-level tags whose boundaries should become newlines when stripping.
const BLOCK_TAGS = new Set([
  "P",
  "DIV",
  "LI",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BLOCKQUOTE",
  "PRE",
]);

const htmlToPlainText = (html: string): string => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const parts: string[] = [];
  let buf = "";

  const flush = () => {
    if (buf.length > 0) {
      parts.push(buf);
      buf = "";
    }
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      buf += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (el.tagName === "BR") {
      flush();
      return;
    }
    const isBlock = BLOCK_TAGS.has(el.tagName);
    if (isBlock) flush();
    for (const child of Array.from(el.childNodes)) walk(child);
    if (isBlock) flush();
  };

  walk(doc.body);
  flush();
  return parts.join("\n").trim();
};

/** Truncate HTML by visible-text character count while preserving the
 *  surrounding tag structure. Appends "…" only when truncation occurred. */
const truncateHtml = (html: string, maxLength: number): string => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  let remaining = maxLength;

  // Returns true if budget was exhausted (i.e. truncation happened).
  const copy = (source: Node, dest: Node): boolean => {
    for (const child of Array.from(source.childNodes)) {
      if (remaining <= 0) return true;
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? "";
        if (text.length <= remaining) {
          dest.appendChild(doc.createTextNode(text));
          remaining -= text.length;
        } else {
          dest.appendChild(doc.createTextNode(text.slice(0, remaining)));
          remaining = 0;
          return true;
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const clone = (child as Element).cloneNode(false);
        dest.appendChild(clone);
        if (copy(child, clone)) return true;
      }
    }
    return false;
  };

  const root = doc.createElement("div");
  const truncated = copy(doc.body, root);
  return truncated ? `${root.innerHTML}...` : root.innerHTML;
};
const RichTextDisplayInner = ({
  value,
  styled = true,
  maxLength,
  as: Wrapper = "div",
  className,
}: RichTextDisplayProps) => {
  // Sanitize once at the boundary; every downstream path (plain-text stripping,
  // truncation, direct injection) operates on the allowlisted HTML only.
  const safeHtml = useMemo(() => sanitizeRichText(value), [value]);

  const plainText = useMemo(() => {
    if (styled) return "";
    const text = htmlToPlainText(safeHtml);
    return maxLength === undefined ? text : truncateText(text, maxLength);
  }, [styled, safeHtml, maxLength]);

  const styledHtml = useMemo(() => {
    if (!styled) return "";
    return maxLength === undefined ? safeHtml : truncateHtml(safeHtml, maxLength);
  }, [styled, safeHtml, maxLength]);

  if (!styled) {
    return <Wrapper className={`${styles.plain} ${className ?? ""}`.trim()}>{plainText}</Wrapper>;
  }

  return (
    <Wrapper
      className={`${styles.content} ${className ?? ""}`.trim()}
      // eslint-disable-next-line react/no-danger -- styledHtml is DOMPurify-sanitized via sanitizeRichText (allowlist matches the TipTap schema; scripts/handlers/unsafe URLs stripped)
      dangerouslySetInnerHTML={{ __html: styledHtml }}
    />
  );
};

// Wrapped at the export so every caller is protected without changes: the
// dangerouslySetInnerHTML render and the custom DOM-walking utils above could
// throw on malformed input despite the sanitize-at-the-boundary step.
const RichTextDisplay = (props: RichTextDisplayProps) => (
  <ErrorBoundary
    boundaryName="rich-text-display"
    fallback={<ErrorFallback message="Something went wrong rendering this content." />}
  >
    <RichTextDisplayInner {...props} />
  </ErrorBoundary>
);

export { RichTextDisplay };
