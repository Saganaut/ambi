package com.cephadex.ambi.theme.enums;

/**
 * Light/dark intent of a theme. {@code SYSTEM} defers to the viewer's OS
 * preference at render time — the frontend resolves it to {@code LIGHT} or
 * {@code DARK} when applying the theme; the backend only stores the intent.
 */
public enum ThemeMode {
    LIGHT, DARK, SYSTEM
}
