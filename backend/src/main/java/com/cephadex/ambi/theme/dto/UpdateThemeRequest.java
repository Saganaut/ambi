package com.cephadex.ambi.theme.dto;

import com.cephadex.ambi.common.validation.ValidationConstants;
import com.cephadex.ambi.theme.ThemeSpec;

import jakarta.validation.constraints.Size;

/**
 * A full replacement of a theme's editable fields (MANAGE capability). The
 * client submits the complete desired state; both fields are applied, so an
 * omitted value clears the corresponding field.
 *
 * <p>Ownership, scope and identifiers are intentionally absent — those are fixed
 * at creation. To re-scope a theme, create a new one.
 *
 * @param name human-facing theme name
 * @param spec the renderable payload (appearance, palette, background, logo)
 */
public record UpdateThemeRequest(
        @Size(max = ValidationConstants.NAME_MAX) String name,
        ThemeSpec spec) {
}
