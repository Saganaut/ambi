package com.cephadex.ambi.presentation.slide.content;

import java.util.List;

import org.owasp.html.CssSchema;
import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;
import org.springframework.stereotype.Component;

/**
 * Allowlist HTML sanitizer for stored rich text. Slides carry a single
 * editor-authored HTML string ({@link RichTextContent#body()}); every renderer
 * injects that string into the DOM, so it is only ever as trustworthy as its
 * source. The frontend {@code sanitizeHtml} pass (DOMPurify) cleans it again at
 * the render boundary, but the stored value must be safe on its own: seed data,
 * a direct authenticated {@code PUT}, or a future import can all put markup in
 * front of a renderer without ever passing through the TipTap editor. This
 * component is that storage-boundary defense — it runs on the write path so the
 * persisted {@code body} can never carry scripts, event handlers, unsafe URL
 * schemes, or layout-hijacking CSS regardless of how it was ingested.
 *
 * <p>The policy mirrors the frontend allowlist (which mirrors the TipTap schema:
 * StarterKit + TextStyle + Color + FontSize + Link):
 * <ul>
 *   <li>Block/inline formatting, lists, headings, links, and {@code hr}.</li>
 *   <li>Inline {@code style} constrained to exactly {@code color} and
 *       {@code font-size} — the only properties the editor's Color/FontSize
 *       marks emit — which drops overlay/clickjacking declarations
 *       ({@code position}, {@code inset}) and value-smuggling
 *       ({@code url(...)}, {@code expression(...)}).</li>
 *   <li>Standard URL protocols only ({@code http}, {@code https}, {@code mailto}),
 *       so {@code javascript:} and other unsafe schemes are stripped.</li>
 *   <li>{@code rel="noopener noreferrer"} forced on every link, overriding any
 *       author-supplied {@code rel}, so a {@code target="_blank"} link rendered
 *       cross-user cannot hand the destination a {@code window.opener} handle
 *       (reverse tabnabbing).</li>
 * </ul>
 *
 * <p>The {@link PolicyFactory} is immutable and thread-safe, built once and
 * shared; the component is a stateless singleton.
 */
@Component
public class RichTextSanitizer {

    // color/font-size are the only declarations the editor's Color and FontSize
    // marks emit; everything else in an inline style is dropped.
    private static final PolicyFactory POLICY = new HtmlPolicyBuilder()
            .allowElements("p", "br", "span", "strong", "b", "em", "i", "s", "del", "u",
                    "code", "pre", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6",
                    "ul", "ol", "li", "a", "hr")
            .allowAttributes("href", "target").onElements("a")
            .allowStandardUrlProtocols()
            .requireRelsOnLinks("noopener", "noreferrer")
            .allowStyling(CssSchema.withProperties(List.of("color", "font-size")))
            .toFactory();

    /**
     * Clean an HTML string to the rich-text allowlist. {@code null} passes
     * through unchanged (a blank slide has no body); everything else is
     * allowlist-filtered.
     */
    public String sanitize(String html) {
        return html == null ? null : POLICY.sanitize(html);
    }

    /**
     * Return a copy of {@code content} with its rich-text HTML sanitized. Only
     * {@link RichTextContent} carries editor HTML today, so any other content
     * type is returned unchanged. Called on the slide write path so persisted
     * content is safe regardless of ingestion route.
     */
    public SlideContent sanitize(SlideContent content) {
        if (content instanceof RichTextContent rich) {
            return new RichTextContent(
                    sanitize(rich.body()), rich.horizontalAlign(), rich.verticalAlign());
        }
        return content;
    }
}
