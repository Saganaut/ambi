package com.cephadex.ambi.theme.dto;

import com.cephadex.ambi.common.validation.ValidationConstants;
import com.cephadex.ambi.theme.ThemeSpec;

import jakarta.validation.constraints.Size;

/**
 * Body for the optimistic create {@code PUT /api/themes/{id}} — the client mints
 * the theme's UUID and submits the full desired state.
 *
 * <p>{@code organizationId} selects the scope: a blank/null value creates a
 * personal theme owned by the caller; a non-blank value creates a theme owned by
 * that organization (the caller must be an OWNER/ADMIN of it). Ownership is fixed
 * at creation — it is not part of {@link UpdateThemeRequest}.
 *
 * @param name           human-facing theme name
 * @param organizationId owning org id, or blank/null for a personal theme
 * @param spec           the renderable payload (appearance, palette, background, logo)
 */
public record CreateThemeRequest(
        @Size(max = ValidationConstants.NAME_MAX) String name,
        String organizationId,
        ThemeSpec spec) {
}
