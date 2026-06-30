package com.cephadex.ambi.session.dto;

import com.cephadex.ambi.common.validation.ValidationConstants;
import com.cephadex.ambi.user.Avatar;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/liveSessions/join}: the room code plus the display
 * name/avatar the joining player presents (a guest picks these; a registered
 * client can pre-fill from the user's profile).
 */
public record JoinSessionRequest(
        @NotBlank String roomCode,
        @NotBlank @Size(max = ValidationConstants.DISPLAY_NAME_MAX) String displayName,
        @Valid Avatar avatar,
        String colorTag) {
}
