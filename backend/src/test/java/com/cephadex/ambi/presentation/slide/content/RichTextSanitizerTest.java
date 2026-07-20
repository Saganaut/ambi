package com.cephadex.ambi.presentation.slide.content;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.presentation.slide.enums.HorizontalAlign;
import com.cephadex.ambi.presentation.slide.enums.VerticalAlign;

/**
 * The storage-boundary rich-text sanitizer. Proves the allowlist neutralizes the
 * XSS vectors the frontend render-boundary pass also covers (scripts, event
 * handlers, unsafe URL schemes, layout-hijacking CSS, reverse tabnabbing) while
 * preserving legitimate editor formatting, and that the {@link SlideContent}
 * overload rewrites only {@link RichTextContent} bodies.
 */
class RichTextSanitizerTest {

    private final RichTextSanitizer sanitizer = new RichTextSanitizer();

    // ── Neutralized vectors ─────────────────────────────────────────────────

    @Test
    void stripsScriptElements() {
        assertThat(sanitizer.sanitize("<script>alert(1)</script><p>safe</p>"))
                .isEqualTo("<p>safe</p>");
    }

    @Test
    void stripsEventHandlerAttributes() {
        assertThat(sanitizer.sanitize("<p onclick=\"evil()\">click</p>"))
                .isEqualTo("<p>click</p>");
    }

    @Test
    void dropsImgWithOnerrorEntirely() {
        // img is not on the allowlist, so the whole element (and its handler) goes.
        assertThat(sanitizer.sanitize("<img src=x onerror=alert(1)>")).isEmpty();
    }

    @Test
    void stripsUnsafeHrefScheme() {
        // The javascript: URL is rejected; the anchor's text survives.
        assertThat(sanitizer.sanitize("<a href=\"javascript:alert(1)\">x</a>"))
                .isEqualTo("x");
    }

    @Test
    void stripsSvgAndIframe() {
        assertThat(sanitizer.sanitize("<svg onload=alert(1)></svg>")).isEmpty();
        assertThat(sanitizer.sanitize("<iframe src=\"//evil\"></iframe>")).isEmpty();
    }

    // ── Inline style is constrained to color / font-size ────────────────────

    @Test
    void keepsColorAndFontSizeDeclarations() {
        assertThat(sanitizer.sanitize("<span style=\"color: red; font-size: 20px\">ok</span>"))
                .contains("color:red")
                .contains("font-size:20px")
                .startsWith("<span");
    }

    @Test
    void dropsOverlayAndValueSmugglingStyles() {
        // Clickjacking overlay: position/inset are not color/font-size, so they go
        // while the allowed color declaration on the same attribute survives.
        assertThat(sanitizer.sanitize("<span style=\"position: fixed; inset: 0; color: red\">x</span>"))
                .doesNotContain("position")
                .doesNotContain("inset")
                .contains("color:red");
        // url()/expression() value smuggling drops the whole (now-empty) attribute
        // and, with no surviving content-bearing attribute, the span text remains.
        assertThat(sanitizer.sanitize("<span style=\"background: url(http://evil)\">x</span>"))
                .doesNotContain("url(");
        assertThat(sanitizer.sanitize("<span style=\"color: expression(alert(1))\">x</span>"))
                .doesNotContain("expression");
    }

    // ── Links: forced safe rel, preserved target ────────────────────────────

    @Test
    void forcesSafeRelOnTargetedLinks() {
        assertThat(sanitizer.sanitize(
                "<a href=\"https://example.com\" target=\"_blank\">link</a>"))
                .contains("target=\"_blank\"")
                .contains("rel=\"noopener noreferrer\"");
    }

    @Test
    void overridesAttackerSuppliedRel() {
        assertThat(sanitizer.sanitize(
                "<a href=\"https://e.com\" target=\"_blank\" rel=\"opener\">l</a>"))
                .contains("rel=\"noopener noreferrer\"")
                .doesNotContain("rel=\"opener\"");
    }

    // ── Legitimate formatting survives ──────────────────────────────────────

    @Test
    void preservesEditorFormatting() {
        String html = "<h2>Heading</h2><p><strong>bold</strong> <em>italic</em></p>"
                + "<ul><li>one</li><li>two</li></ul>";
        assertThat(sanitizer.sanitize(html)).isEqualTo(html);
    }

    // ── Null / empty handling ───────────────────────────────────────────────

    @Test
    void passesNullThrough() {
        assertThat(sanitizer.sanitize((String) null)).isNull();
    }

    // ── SlideContent dispatch ───────────────────────────────────────────────

    @Test
    void sanitizesRichTextContentBodyAndKeepsAlignment() {
        RichTextContent dirty = new RichTextContent(
                "<p onclick=\"evil()\">hi</p><script>alert(1)</script>",
                HorizontalAlign.CENTER, VerticalAlign.MIDDLE);

        SlideContent result = sanitizer.sanitize(dirty);

        assertThat(result).isInstanceOfSatisfying(RichTextContent.class, rich -> {
            assertThat(rich.body()).isEqualTo("<p>hi</p>");
            assertThat(rich.horizontalAlign()).isEqualTo(HorizontalAlign.CENTER);
            assertThat(rich.verticalAlign()).isEqualTo(VerticalAlign.MIDDLE);
        });
    }

    @Test
    void passesNullBodiedRichTextContentThrough() {
        RichTextContent blank = new RichTextContent(null, null, null);
        assertThat(sanitizer.sanitize(blank))
                .isEqualTo(new RichTextContent(null, null, null));
    }

    @Test
    void leavesNonRichTextContentUnchanged() {
        TitleContent title = new TitleContent("subtitle");
        assertThat(sanitizer.sanitize((SlideContent) title)).isSameAs(title);
    }
}
