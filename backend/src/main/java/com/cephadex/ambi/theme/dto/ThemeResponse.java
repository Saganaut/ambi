package com.cephadex.ambi.theme.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;

import com.cephadex.ambi.common.ViewerPermissions;
import com.cephadex.ambi.theme.Theme;
import com.cephadex.ambi.theme.ThemeOwnership;
import com.cephadex.ambi.theme.ThemeSpec;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The wire view of a {@link Theme}. The renderable colours and images are
 * carried as the nested {@link ThemeSpec}, so the client applies the theme
 * straight from {@code spec} without reshaping.
 *
 * @param id             the theme id
 * @param name           human-facing theme name
 * @param ownership      who owns the theme (user or organization)
 * @param organizationId owning org id when org-owned, else null
 * @param creatorUserId  the user who created the theme
 * @param builtIn        true for app-provided preset themes
 * @param spec           the renderable payload (mode, hues, background, logo)
 * @param createdAt      creation timestamp
 * @param updatedAt      last-modified timestamp
 * @param permissions    the requesting principal's capabilities over this theme
 */

// TODO: Consider not sending back the id and instead having a public id
public record ThemeResponse(
        String id,
        String name,
        ThemeOwnership ownership,
        String organizationId,
        String creatorUserId,
        boolean builtIn,
        ThemeSpec spec,
        Instant createdAt,
        Instant updatedAt,
        @Schema(requiredMode = REQUIRED) ViewerPermissions permissions) {

    /**
     * Projects a persisted {@link Theme} onto its response, stamping the
     * requesting principal's {@code permissions} as computed by {@code ThemeService}.
     */
    public static ThemeResponse from(Theme theme, ViewerPermissions permissions) {
        return new ThemeResponse(
                theme.getId(),
                theme.getName(),
                theme.getOwnership(),
                theme.getOrganizationId(),
                theme.getCreatorUserId(),
                theme.isBuiltIn(),
                theme.getSpec(),
                theme.getCreatedAt(),
                theme.getUpdatedAt(),
                permissions);
    }
}
