// Unit tests for sanitizeRichText — the render-boundary XSS guard for
// rich-text HTML. Verifies known attack vectors are neutralized while the
// TipTap authoring schema (formatting, lists, headings, links, colour/size
// spans) survives intact.
import { describe, it, expect } from "vitest";
import { sanitizeRichText } from "./sanitizeHtml";

describe("sanitizeRichText", () => {
  describe("neutralizes XSS payloads", () => {
    it("strips <script> tags", () => {
      const out = sanitizeRichText(
        "<p>hi</p><script>alert('xss')</script>",
      );
      expect(out).not.toContain("<script");
      expect(out).not.toContain("alert");
      expect(out).toContain("<p>hi</p>");
    });

    it("strips inline event handlers like onerror", () => {
      const out = sanitizeRichText('<img src=x onerror="alert(1)">');
      expect(out).not.toContain("onerror");
      expect(out).not.toContain("alert");
      // <img> is not in the allowlist, so it is dropped entirely.
      expect(out).not.toContain("<img");
    });

    it("removes javascript: href schemes but keeps the link text", () => {
      const out = sanitizeRichText(
        '<a href="javascript:alert(1)">click</a>',
      );
      expect(out).not.toContain("javascript:");
      expect(out).toContain("click");
    });

    it("drops disallowed elements (iframe, object, style)", () => {
      const out = sanitizeRichText(
        '<iframe src="evil"></iframe><object></object><style>body{}</style><p>ok</p>',
      );
      expect(out).not.toContain("<iframe");
      expect(out).not.toContain("<object");
      expect(out).not.toContain("<style");
      expect(out).toContain("<p>ok</p>");
    });

    it("neutralizes onload on the svg vector", () => {
      const out = sanitizeRichText('<svg onload="alert(1)"></svg><p>x</p>');
      expect(out).not.toContain("onload");
      expect(out).not.toContain("<svg");
    });

    it("strips dangerous CSS properties from an allowed style attribute", () => {
      const out = sanitizeRichText(
        '<span style="position: fixed; inset: 0; z-index: 99999; color: red">x</span>',
      );
      // The overlay properties (UI-redressing / clickjacking vector) are gone,
      // but the legitimate colour declaration survives.
      expect(out).not.toContain("position");
      expect(out).not.toContain("inset");
      expect(out).not.toContain("z-index");
      expect(out).toContain("color: red");
    });

    it("strips url()/expression values from style", () => {
      const out = sanitizeRichText(
        '<span style="background-image: url(javascript:alert(1))">y</span>',
      );
      expect(out).not.toContain("url(");
      expect(out).not.toContain("javascript:");
      expect(out).not.toContain("background");
      // No safe declarations remain, so the style attribute is dropped entirely.
      expect(out).not.toContain("style=");
      expect(out).toContain("y");
    });

    it("returns empty string for empty input", () => {
      expect(sanitizeRichText("")).toBe("");
    });
  });

  describe("preserves legitimate TipTap formatting", () => {
    it("keeps bold, italic, strike and underline marks", () => {
      const out = sanitizeRichText(
        "<p><strong>b</strong><em>i</em><s>s</s><u>u</u></p>",
      );
      expect(out).toContain("<strong>b</strong>");
      expect(out).toContain("<em>i</em>");
      expect(out).toContain("<s>s</s>");
      expect(out).toContain("<u>u</u>");
    });

    it("keeps ordered and bullet lists", () => {
      const out = sanitizeRichText(
        "<ul><li>one</li></ul><ol><li>two</li></ol>",
      );
      expect(out).toContain("<ul><li>one</li></ul>");
      expect(out).toContain("<ol><li>two</li></ol>");
    });

    it("keeps headings and blockquotes", () => {
      const out = sanitizeRichText(
        "<h1>title</h1><h2>sub</h2><blockquote>q</blockquote>",
      );
      expect(out).toContain("<h1>title</h1>");
      expect(out).toContain("<h2>sub</h2>");
      expect(out).toContain("<blockquote>q</blockquote>");
    });

    it("keeps safe links", () => {
      const out = sanitizeRichText(
        '<a href="https://example.com">link</a>',
      );
      expect(out).toContain('href="https://example.com"');
      expect(out).toContain("link");
    });

    it("forces rel=noopener noreferrer on target=_blank links", () => {
      const out = sanitizeRichText(
        '<a href="https://example.com" target="_blank">link</a>',
      );
      expect(out).toContain('target="_blank"');
      expect(out).toContain('rel="noopener noreferrer"');
    });

    it("overrides an attacker-supplied rel on a targeted link", () => {
      const out = sanitizeRichText(
        '<a href="https://evil.com" target="_blank" rel="opener">x</a>',
      );
      // The unsafe rel must be replaced, not merged.
      expect(out).not.toContain('rel="opener"');
      expect(out).toContain('rel="noopener noreferrer"');
    });

    it("keeps colour and font-size inline style spans", () => {
      const out = sanitizeRichText(
        '<p><span style="color: rgb(255, 0, 0)">red</span>' +
          '<span style="font-size: 24px">big</span></p>',
      );
      expect(out).toContain("color: rgb(255, 0, 0)");
      expect(out).toContain(">red</span>");
      expect(out).toContain("font-size: 24px");
      expect(out).toContain(">big</span>");
    });
  });
});
