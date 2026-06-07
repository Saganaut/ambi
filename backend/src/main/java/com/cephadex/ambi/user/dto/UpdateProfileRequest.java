package com.cephadex.ambi.user.dto;

import com.cephadex.ambi.common.validation.ValidationConstants;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

/**
 * {@code PATCH /api/users/me} body — a sparse profile edit. Each field is
 * optional: a {@code null} leaves the current value untouched, so a caller can
 * update one field without resending the rest. Identity ({@code username},
 * {@code email}, level) is never editable here.
 *
 * @param displayName new friendly name; non-blank when present.
 * @param timezone    IANA zone id (e.g. {@code America/New_York}); validity is
 *                    checked in the aggregate, where it is a business invariant.
 * @param avatar      replacement avatar selection; the whole avatar is replaced
 *                    when present (it is a small value object, not patched).
 */
public record UpdateProfileRequest(
        @Size(min = ValidationConstants.DISPLAY_NAME_MIN, max = ValidationConstants.DISPLAY_NAME_MAX) String displayName,
        @Size(max = ValidationConstants.TIMEZONE_MAX) String timezone,
        @Valid AvatarSelection avatar) {
}
