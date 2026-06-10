package com.cephadex.ambi.theme;

import org.springframework.data.mongodb.core.mapping.Field;

/**
 * The explicit colour palette of a theme — the curated set of colours a theme
 * author picks, in the spirit of VSCode / terminal themes (Catppuccin, Dracula,
 * One Dark, Gruvbox). It replaces the old two-hue model: rather than generating
 * every colour from {@code huePrimary}/{@code hueAccent}, a theme now names its
 * surfaces, text, brand and status colours directly.
 *
 * <p>These 16 roles are the <em>authored</em> colours. The frontend token engine
 * (tokens.css) derives the remaining ~25 semantic tokens — inverted surfaces,
 * edge hairlines, action hover/active states, and the light-tint/readable-text
 * triads for each status colour — from these roles plus the theme's
 * {@code appearance}. Each value is a CSS colour string (hex like {@code #1e1e2e}
 * or any valid CSS colour); the backend never parses them.
 *
 * @param canvas          app background — the lowest surface
 * @param surface         default panel / card surface, one step above canvas
 * @param surfaceRaised   elevated surface (raised cards, popovers)
 * @param subtle          a muted, recessed fill (wells, inset rows)
 * @param foreground      primary text colour
 * @param mutedForeground secondary / muted text colour
 * @param primary         brand fill (primary buttons, active accents)
 * @param onPrimary       text/icon colour that sits on top of {@code primary}
 * @param accent          accent for links, focus rings, highlights
 * @param accentSecondary secondary accent for variety and hover emphasis
 * @param border          default border colour
 * @param borderSubtle    hairline / low-emphasis border colour
 * @param red             status colour driving error tokens
 * @param green           status colour driving success tokens
 * @param yellow          status colour driving warning tokens
 * @param blue            status colour driving info tokens
 */
public record Palette(
        @Field("canvas") String canvas,
        @Field("surface") String surface,
        @Field("surface_raised") String surfaceRaised,
        @Field("subtle") String subtle,
        @Field("foreground") String foreground,
        @Field("muted_foreground") String mutedForeground,
        @Field("primary") String primary,
        @Field("on_primary") String onPrimary,
        @Field("accent") String accent,
        @Field("accent_secondary") String accentSecondary,
        @Field("border") String border,
        @Field("border_subtle") String borderSubtle,
        @Field("red") String red,
        @Field("green") String green,
        @Field("yellow") String yellow,
        @Field("blue") String blue) {
}
