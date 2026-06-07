package com.cephadex.ambi.auth.dto;

import com.cephadex.ambi.common.validation.ValidationConstants;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * {@code POST /api/auth/register} body.
 *
 * <p>Carries only user-chosen fields. The OAuth identity
 * ({@code provider}, {@code externalProviderId}, {@code email}) is read from
 * the authenticated {@code PRE_REGISTRATION} session principal — never from
 * this DTO — per auth/README.md Inv 5: "any {@code ?provider=&email=…} on the
 * registration page is display prefill only and is never trusted for
 * identity."
 *
 * @param username    desired account handle; DB unique index is the authority
 *                    (Inv 9). Pattern keeps it URL/log-safe.
 * @param displayName optional friendly name; falls back to {@code username}
 *                    when blank.
 * @param newsletter  whether to opt into the product newsletter.
 */
public record RegisterRequest(
        @NotBlank
        @Size(min = ValidationConstants.USERNAME_MIN, max = ValidationConstants.USERNAME_MAX)
        @Pattern(regexp = ValidationConstants.USERNAME_PATTERN,
                message = "may only contain letters, digits, '.', '_' or '-'")
        String username,

        @Size(max = ValidationConstants.DISPLAY_NAME_MAX)
        String displayName,

        boolean newsletter) {
}
