package com.cephadex.ambi.theme;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.theme.enums.ThemeMode;

/**
 * The renderable payload of a theme — everything the UI needs to paint, and
 * nothing about identity or ownership. The token engine (tokens.css) derives
 * every surface, border, text and action colour from {@code mode} plus the two
 * hues, so those three values are the whole colour story; the images sit on top.
 *
 * <p>This is a pure value object: it carries no {@code @Id} and is never
 * persisted on its own. It is embedded in a {@link Theme} (a named, shareable
 * theme) and is the natural shape to embed wherever a "current look" lives.
 *
 * @param mode            light/dark intent; {@code SYSTEM} resolves client-side
 * @param huePrimary      OKLCH hue (0–360) driving surfaces, borders and text
 * @param hueAccent       OKLCH hue (0–360) driving actions and brand accents
 * @param backgroundImage optional page background; reuses {@link AppImage} (and
 *                        its {@code ImageSizeOptions} variants), null if unset
 * @param logoImage       optional brand logo; reuses {@link AppImage}, null if unset
 */
public record ThemeSpec(
        @Field("mode") ThemeMode mode,
        @Field("hue_primary") int huePrimary,
        @Field("hue_accent") int hueAccent,
        @Field("background_image") AppImage backgroundImage,
        @Field("logo_image") AppImage logoImage) {
}
