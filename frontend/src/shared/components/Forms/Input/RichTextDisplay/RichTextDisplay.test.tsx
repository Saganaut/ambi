// Unit tests for RichTextDisplay — confirms the DOMPurify render-boundary
// sanitization neutralizes XSS payloads while legitimate formatting survives,
// and that the plain-text / truncation modes still behave.
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RichTextDisplay } from "./RichTextDisplay";

describe("RichTextDisplay", () => {
  describe("styled mode sanitization", () => {
    it("does not inject <script> tags into the DOM", () => {
      const { container } = render(
        <RichTextDisplay value="<p>hi</p><script>alert('xss')</script>" />,
      );
      expect(container.querySelector("script")).toBeNull();
      expect(container.textContent).toContain("hi");
    });

    it("strips onerror handlers and disallowed <img>", () => {
      const { container } = render(
        <RichTextDisplay value={'<p>ok</p><img src=x onerror="alert(1)">'} />,
      );
      expect(container.querySelector("img")).toBeNull();
      expect(container.innerHTML).not.toContain("onerror");
      expect(container.textContent).toContain("ok");
    });

    it("removes javascript: hrefs while keeping the anchor text", () => {
      const { container } = render(
        <RichTextDisplay value={'<a href="javascript:alert(1)">click</a>'} />,
      );
      expect(container.innerHTML).not.toContain("javascript:");
      expect(container.textContent).toContain("click");
    });

    it("stays safe on the truncation path (sanitize before truncate)", () => {
      const { container } = render(
        <RichTextDisplay
          maxLength={20}
          value={
            "<p>safe text here</p><script>alert('x')</script>" +
            '<img src=x onerror="alert(1)">'
          }
        />,
      );
      expect(container.querySelector("script")).toBeNull();
      expect(container.querySelector("img")).toBeNull();
      expect(container.innerHTML).not.toContain("onerror");
      expect(container.textContent).toContain("safe text");
    });

    it("preserves legitimate formatting (bold, list, heading, link)", () => {
      const { container } = render(
        <RichTextDisplay
          value={
            "<h1>Title</h1><p><strong>bold</strong></p>" +
            '<ul><li>item</li></ul><a href="https://example.com">link</a>'
          }
        />,
      );
      expect(container.querySelector("h1")).not.toBeNull();
      expect(container.querySelector("strong")).not.toBeNull();
      expect(container.querySelector("ul li")).not.toBeNull();
      const anchor = container.querySelector("a");
      expect(anchor?.getAttribute("href")).toBe("https://example.com");
    });
  });

  describe("plain mode", () => {
    it("renders only text content with no markup, even for hostile input", () => {
      const { container } = render(
        <RichTextDisplay
          styled={false}
          value="<p>Line one</p><script>alert('x')</script><p>Line two</p>"
        />,
      );
      expect(container.querySelector("script")).toBeNull();
      expect(container.querySelector("p")).toBeNull();
      expect(container.textContent).toContain("Line one");
      expect(container.textContent).toContain("Line two");
      expect(container.textContent).not.toContain("alert");
    });
  });
});
