// Client-side HTML sanitization for rich-text content.
//
// RichTextInput authors content with TipTap and persists it as an HTML string
// (`editor.getHTML()`). Everything that renders that string does so through
// `dangerouslySetInnerHTML`, so the string is only ever as trustworthy as its
// source. TipTap constrains what the *editor* can produce, but the stored
// `body` is a plain string on the wire: seed data, a direct API write, an
// imported deck, or a `javascript:` href typed into the link editor can all
// put markup outside that schema in front of the renderer. Sanitizing at the
// render boundary is defense in depth — it guarantees the HTML we inject can
// never carry scripts, event handlers, or unsafe URL schemes regardless of how
// it was produced.
//
// The allowlist mirrors the TipTap schema in use (StarterKit + TextStyle +
// Color + FontSize + Link): block/inline formatting, lists, headings, links,
// and inline `style` spans. DOMPurify handles tag/attribute stripping and
// unsafe href schemes; the `style` attribute needs extra care (see below).
import DOMPurify from "dompurify";

// Tags the TipTap schema can emit. Aliases (b/i/del) are included so
// legitimate formatting survives even if serialization differs.
const ALLOWED_TAGS = [
  "p",
  "br",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "del",
  "u",
  "code",
  "pre",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "a",
  "hr",
];

// `style` carries Color / FontSize inline declarations; `href`/`target`/`rel`
// support the Link mark. DOMPurify's default URI policy rejects `javascript:`
// and other unsafe href schemes. `target`/`rel` are kept so authored links can
// open in a new tab, but any anchor carrying `target` has its `rel` forced to a
// safe value below (DOMPurify does not link the two attributes itself).
const ALLOWED_ATTR = ["style", "href", "target", "rel"];

// DOMPurify allows or drops the `style` attribute wholesale — it does NOT
// restrict which CSS *properties* it contains. An unrestricted `style` lets
// untrusted content inject e.g. `position: fixed; inset: 0; z-index: 99999`
// (a full-viewport overlay for UI-redressing / clickjacking) or
// `background: url(...)` requests. The TipTap Color/FontSize marks only ever
// emit `color` and `font-size`, so we hard-constrain the attribute to exactly
// those two properties and reject any value containing function/url/import
// syntax that could smuggle a request or script.
const SAFE_STYLE_PROPERTIES = new Set(["color", "font-size"]);
const UNSAFE_STYLE_VALUE = /url\(|expression|javascript:|@import|[<>]/i;

const filterStyleValue = (style: string): string =>
  style
    .split(";")
    .map((declaration) => {
      const separator = declaration.indexOf(":");
      if (separator === -1) return null;
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const value = declaration.slice(separator + 1).trim();
      if (!SAFE_STYLE_PROPERTIES.has(property)) return null;
      if (value === "" || UNSAFE_STYLE_VALUE.test(value)) return null;
      return `${property}: ${value}`;
    })
    .filter((declaration): declaration is string => declaration !== null)
    .join("; ");

// Register the style-property guard once. sanitizeRichText is the only consumer
// of the shared DOMPurify instance, so a module-level hook is safe here.
DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName !== "style") return;
  const filtered = filterStyleValue(data.attrValue);
  if (filtered === "") {
    data.keepAttr = false;
    return;
  }
  data.attrValue = filtered;
});

// Force safe `rel` on any anchor that opens a new browsing context. A
// `target="_blank"` link with no (or attacker-chosen) `rel` hands the
// destination page a `window.opener` handle back onto the viewer's tab
// (reverse tabnabbing → phishing). This matters here because rich text is
// rendered cross-user (e.g. a slide title streamed to every live-session
// participant), so a link authored outside the editor must not be trusted to
// set `rel` itself. `noopener` severs the opener handle; `noreferrer` also
// drops the Referer.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.hasAttribute("target")) {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

/**
 * Sanitize a rich-text HTML string to the TipTap-authoring allowlist. Strips
 * any tag/attribute outside the schema (scripts, event handlers, unknown
 * elements), constrains inline `style` to `color`/`font-size`, and neutralizes
 * unsafe href schemes, while preserving legitimate formatting (bold, italics,
 * lists, headings, links, colour/size spans).
 */
const sanitizeRichText = (html: string): string => {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // No data-* attributes and no full-document/template markup.
    ALLOW_DATA_ATTR: false,
  });
};

export { sanitizeRichText };
