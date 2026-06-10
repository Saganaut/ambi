package com.cephadex.ambi.theme.enums;

/**
 * A theme's intrinsic light/dark character. Unlike the retired {@code ThemeMode}
 * (which carried a {@code SYSTEM} "follow the OS" intent), appearance is a fixed
 * property of the palette itself: Dracula <em>is</em> dark, Catppuccin Latte
 * <em>is</em> light. The frontend keys derived tokens off it — the edge tint
 * (darken vs lighten), inverted surfaces, and any {@code [data-appearance]} rule.
 */
public enum ThemeAppearance {
    LIGHT, DARK
}
