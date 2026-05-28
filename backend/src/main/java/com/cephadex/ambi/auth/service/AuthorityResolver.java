package com.cephadex.ambi.auth.service;

import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Maps an identity state (+ optional backing {@link User}) to Spring Security
 * authorities. This is the single home of Invariant 8: a
 * {@code PRE_REGISTRATION} principal (no {@code User}) gets <em>only</em>
 * {@code ROLE_PRE_REGISTRATION} — it must never be granted {@code ROLE_USER}
 * and must never NPE on the null {@code User}.
 *
 * <p>For a backed principal, authorities are cumulative over
 * {@link UserLevel}: a user is granted {@code ROLE_<LEVEL>} for every level
 * whose weight it meets (via {@link UserLevel#hasAccessTo}), so a route's
 * weight-based "minimum level" check maps directly onto Spring's
 * {@code hasRole(...)}.
 */
public final class AuthorityResolver {

    public static final String ROLE_PRE_REGISTRATION = "ROLE_PRE_REGISTRATION";

    private AuthorityResolver() {
    }

    public static List<GrantedAuthority> resolve(IdentityState state, User user) {
        return switch (state) {
            case VISITOR -> List.of();
            // Held in session only; the User is null by definition. Never grant USER.
            case PRE_REGISTRATION -> List.of(new SimpleGrantedAuthority(ROLE_PRE_REGISTRATION));
            // Both are backed by a persisted User; authorities come from its level.
            case GUEST, REGISTERED -> cumulativeRoles(user);
        };
    }

    private static List<GrantedAuthority> cumulativeRoles(User user) {
        if (user == null || user.getUserLevel() == null) {
            // Defensive: a backed state with no level grants nothing rather than
            // silently defaulting to USER.
            return List.of();
        }
        UserLevel level = user.getUserLevel();
        return java.util.Arrays.stream(UserLevel.values())
                .filter(level::hasAccessTo)
                .map(l -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + l.name()))
                .toList();
    }
}
