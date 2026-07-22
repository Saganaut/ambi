package com.cephadex.ambi.presentation.slide.content;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.owasp.html.CssSchema;
import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.theme.Palette;

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
 * <p>The policy follows the frontend allowlist (which mirrors the TipTap schema:
 * StarterKit + TextStyle + Color + FontSize + Link):
 * <ul>
 *   <li>Block/inline formatting, lists, headings, links, and {@code hr}.</li>
 *   <li>Inline {@code style} constrained to exactly {@code color} and
 *       {@code font-size} — the only properties the editor's Color/FontSize
 *       marks emit — which drops overlay/clickjacking declarations
 *       ({@code position}, {@code inset}) and value-smuggling
 *       ({@code url(...)}, {@code expression(...)}).</li>
 *   <li>{@code color} accepts every form the editor actually produces, not just
 *       hex: browsers normalize a picked hex to {@code rgb(...)} on
 *       serialization, and theme swatches persist live {@code var(--role-*)}
 *       references so the text follows the deck theme. Accepted values are hex,
 *       the CSS named colors, {@code rgb()}/{@code rgba()}/{@code hsl()}/
 *       {@code hsla()}/{@code oklch()} in both comma and modern slash syntax,
 *       and {@code var()} restricted to the {@link Palette} role custom
 *       properties. Function arguments admit only numbers, percentages, and the
 *       {@code , / deg none} separators — nested functions ({@code url(...)},
 *       {@code expression(...)}) and non-role {@code var()} references are
 *       still stripped.</li>
 *   <li>Standard URL protocols only ({@code http}, {@code https}, {@code mailto}),
 *       so {@code javascript:} and other unsafe schemes are stripped.</li>
 *   <li>{@code noopener} and {@code noreferrer} rel tokens forced on <em>every</em>
 *       link, overriding any author-supplied {@code rel}, so a link rendered
 *       cross-user cannot hand the destination a {@code window.opener} handle
 *       (reverse tabnabbing). This is deliberately stricter than the client,
 *       which forces the rel only on links that carry a {@code target}: the
 *       OWASP builder applies {@link HtmlPolicyBuilder#requireRelsOnLinks} to all
 *       links, and a safe {@code rel} on a same-tab link is harmless. The token
 *       order the library emits is not contractual, so callers must not depend on
 *       it.</li>
 * </ul>
 *
 * <p>The {@link PolicyFactory} is immutable and thread-safe, built once and
 * shared; the component is a stateless singleton.
 */
@Component
public class RichTextSanitizer {

    // CssSchema.Property value-class bits, restated because the library keeps
    // its BIT_* constants package-private: 1 admits numeric quantities
    // (including percentages), 2 admits #hex values, 4 admits negative
    // quantities (an oklch hue can legitimately be negative).
    private static final int BIT_QUANTITY = 1;
    private static final int BIT_HASH_VALUE = 2;
    private static final int BIT_NEGATIVE = 4;

    // The CSS named colors (plus `inherit`), copied verbatim from the library's
    // default `color` property. The default definition can't be reused because
    // extending its function set (oklch, var) requires replacing the whole
    // Property, and its literal set is not exposed through any public API.
    private static final Set<String> NAMED_COLORS = Set.of(
            "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque",
            "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood",
            "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue",
            "cornsilk", "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod",
            "darkgray", "darkgreen", "darkkhaki", "darkmagenta", "darkolivegreen",
            "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen",
            "darkslateblue", "darkslategray", "darkturquoise", "darkviolet",
            "deeppink", "deepskyblue", "dimgray", "dodgerblue", "firebrick",
            "floralwhite", "forestgreen", "fuchsia", "gainsboro", "ghostwhite",
            "gold", "goldenrod", "gray", "green", "greenyellow", "honeydew",
            "hotpink", "indianred", "indigo", "inherit", "ivory", "khaki",
            "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue",
            "lightcoral", "lightcyan", "lightgoldenrodyellow", "lightgreen",
            "lightgrey", "lightpink", "lightsalmon", "lightseagreen",
            "lightskyblue", "lightslategray", "lightsteelblue", "lightyellow",
            "lime", "limegreen", "linen", "magenta", "maroon", "mediumaquamarine",
            "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen",
            "mediumslateblue", "mediumspringgreen", "mediumturquoise",
            "mediumvioletred", "midnightblue", "mintcream", "mistyrose",
            "moccasin", "navajowhite", "navy", "oldlace", "olive", "olivedrab",
            "orange", "orangered", "orchid", "palegoldenrod", "palegreen",
            "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru",
            "pink", "plum", "powderblue", "purple", "red", "rosybrown",
            "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen",
            "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray",
            "snow", "springgreen", "steelblue", "tan", "teal", "thistle", "tomato",
            "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow",
            "yellowgreen");

    // Schema keys for function-argument validation. The "()" suffix follows the
    // library's own convention for these indirect keys: a CSS property name can
    // never contain a parenthesis, so the keys are unreachable as declarations
    // (`color-function(): …` cannot lex) and only apply inside an allowlisted
    // function.
    private static final String COLOR_FUNCTION_ARGS = "color-function()";
    private static final String VAR_ARGS = "var()";

    private static final CssSchema STYLE_SCHEMA = CssSchema.union(
            // font-size is unchanged from the library default.
            CssSchema.withProperties(List.of("font-size")),
            CssSchema.withProperties(Map.of(
                    "color", new CssSchema.Property(
                            BIT_HASH_VALUE,
                            NAMED_COLORS,
                            Map.of("rgb(", COLOR_FUNCTION_ARGS,
                                    "rgba(", COLOR_FUNCTION_ARGS,
                                    "hsl(", COLOR_FUNCTION_ARGS,
                                    "hsla(", COLOR_FUNCTION_ARGS,
                                    "oklch(", COLOR_FUNCTION_ARGS,
                                    "var(", VAR_ARGS)),
                    COLOR_FUNCTION_ARGS, new CssSchema.Property(
                            BIT_QUANTITY | BIT_NEGATIVE,
                            Set.of(",", "/", "deg", "none"),
                            Map.of()),
                    VAR_ARGS, new CssSchema.Property(
                            0, themeRoleCustomProperties(), Map.of()))));

    // color/font-size are the only declarations the editor's Color and FontSize
    // marks emit; everything else in an inline style is dropped.
    private static final PolicyFactory POLICY = new HtmlPolicyBuilder()
            .allowElements("p", "br", "span", "strong", "b", "em", "i", "s", "del", "u",
                    "code", "pre", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6",
                    "ul", "ol", "li", "a", "hr")
            .allowAttributes("href", "target").onElements("a")
            .allowStandardUrlProtocols()
            .requireRelsOnLinks("noopener", "noreferrer")
            .allowStyling(STYLE_SCHEMA)
            .toFactory();

    /**
     * The {@code --role-*} custom properties a stored {@code var()} may
     * reference, derived from {@link Palette}'s record components so the
     * allowlist tracks the theme model automatically. The camelCase→kebab-case
     * mapping mirrors the frontend's {@code ROLE_VARS} table in
     * {@code applyPalette.ts} ({@code surfaceRaised} → {@code --role-surface-raised});
     * the round-trip test pins the resulting names so a drift in either place
     * fails loudly.
     */
    private static Set<String> themeRoleCustomProperties() {
        return Arrays.stream(Palette.class.getRecordComponents())
                .map(component -> component.getName())
                .map(name -> "--role-" + name
                        .replaceAll("([a-z0-9])([A-Z])", "$1-$2")
                        .toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
    }

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
