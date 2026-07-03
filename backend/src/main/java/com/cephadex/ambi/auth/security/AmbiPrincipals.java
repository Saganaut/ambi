package com.cephadex.ambi.auth.security;

import com.cephadex.ambi.common.exception.UnauthorizedException;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Null-tolerant readers over an {@link AmbiPrincipal}. The permission-gated
 * services all extract the same handful of fields from the requester and treat a
 * null principal (or a principal with no backing user) as an anonymous visitor —
 * this centralizes that so the check reads the same everywhere.
 */
public final class AmbiPrincipals {

    private AmbiPrincipals() {
    }

    /** The principal's user id, or null for an anonymous/visitor principal. */
    public static String userId(AmbiPrincipal principal) {
        return principal == null ? null : principal.userId();
    }

    /** The principal's platform level, or null when there is no backing user. */
    public static UserLevel level(AmbiPrincipal principal) {
        return principal == null ? null : principal.userLevel();
    }

    /** Whether the principal has platform ADMIN (or higher). Null-safe: false for a visitor. */
    public static boolean isPlatformAdmin(AmbiPrincipal principal) {
        UserLevel level = level(principal);
        return level != null && level.hasAccessTo(UserLevel.ADMIN);
    }

    /** The principal's user id, or a 401 if the caller is not signed in. */
    public static String requireUserId(AmbiPrincipal principal) {
        String id = userId(principal);
        if (id == null) {
            throw new UnauthorizedException("AUTH_REQUIRED", "Sign in to continue");
        }
        return id;
    }
}
