package com.cephadex.ambi.theme;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.theme.enums.ThemeAppearance;

/**
 * The renderable payload of a theme — everything the UI needs to paint, and
 * nothing about identity or ownership. A theme is a curated {@link Palette} (the
 * named colours an author picks, à la Catppuccin / Dracula / Gruvbox) plus an
 * intrinsic {@link ThemeAppearance}; the frontend token engine (tokens.css)
 * derives every semantic token from those. The images sit on top.
 *
 * <p>This is a pure value object: it carries no {@code @Id} and is never
 * persisted on its own. It is embedded in a {@link Theme} (a named, shareable
 * theme) and in {@code UserPreferences.theme} (a user's current look).
 *
 * <p><b>Back-compat:</b> documents written by the old two-hue model carry
 * {@code hue_primary}/{@code hue_accent}/{@code mode} fields that no longer map
 * to anything here. MongoDB ignores those unknown stored fields, and the missing
 * new fields deserialize as {@code null}, so a legacy spec loads with a
 * {@code null} palette — the frontend falls back to the default brand palette.
 *
 * @param appearance      light/dark character of the palette; never {@code null}
 *                        for new themes, may be {@code null} on legacy docs
 * @param palette         the authored colour roles; {@code null} on legacy docs
 * @param backgroundImage optional page background; reuses {@link AppImage} (and
 *                        its {@code ImageSizeOptions} variants), null if unset
 * @param logoImage       optional brand logo; reuses {@link AppImage}, null if unset
 */
public record ThemeSpec(
        @Field("appearance") ThemeAppearance appearance,
        @Field("palette") Palette palette,
        @Field("background_image") AppImage backgroundImage,
        @Field("logo_image") AppImage logoImage) {
}
