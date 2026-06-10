package com.cephadex.ambi.presentation.deck.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/**
 * Attach a follow-up slide to a parent slide. Everything else about the new
 * slide — the {@code parentId}/{@code childId} link, the {@code sortOrder}
 * placing it immediately after the parent, the {@code FollowUpContent} — is
 * server-owned and derived from the path's parent slide and {@code mode}.
 *
 * @param id    the new slide's id, minted optimistically by the client (the
 *              service mints one only if absent)
 * @param mode  what the follow-up asks about the parent's submissions; must be
 *              valid for the parent's content type
 * @param title optional question prompt (defaults to empty)
 */
public record AddFollowUpRequest(
        @Schema(requiredMode = REQUIRED) String id,
        @Schema(requiredMode = REQUIRED) @NotNull FollowUpMode mode,
        String title) {
}
