package com.cephadex.ambi.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;

import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Pins Invariant 8 (a null-User preRegistration gets exactly one authority and
 * never USER, no NPE) and the cumulative weight-based role grant for backed users.
 */
class AuthorityResolverTest {

    @Test
    void visitorHasNoAuthorities() {
        assertThat(AuthorityResolver.resolve(IdentityState.VISITOR, null)).isEmpty();
    }

    @Test
    void preRegistrationGetsOnlyPreRegistrationAuthority_noNpe_neverUser() {
        List<GrantedAuthority> authorities = AuthorityResolver.resolve(IdentityState.PRE_REGISTRATION, null);

        assertThat(names(authorities)).containsExactly(AuthorityResolver.ROLE_PRE_REGISTRATION);
        assertThat(names(authorities)).doesNotContain("ROLE_USER", "ROLE_GUEST");
    }

    @Test
    void guestGetsGuestRoleOnly() {
        List<GrantedAuthority> authorities = AuthorityResolver.resolve(IdentityState.GUEST, userAt(UserLevel.GUEST));

        assertThat(names(authorities)).containsExactly("ROLE_GUEST");
        assertThat(names(authorities)).doesNotContain("ROLE_USER");
    }

    @Test
    void registeredUserGetsCumulativeRolesUpToTheirLevel() {
        List<GrantedAuthority> user = AuthorityResolver.resolve(IdentityState.REGISTERED, userAt(UserLevel.USER));
        assertThat(names(user)).containsExactlyInAnyOrder("ROLE_GUEST", "ROLE_USER");
        assertThat(names(user)).doesNotContain("ROLE_PREMIUM_USER", "ROLE_ADMIN");

        List<GrantedAuthority> premium =
                AuthorityResolver.resolve(IdentityState.REGISTERED, userAt(UserLevel.PREMIUM_USER));
        assertThat(names(premium)).contains("ROLE_GUEST", "ROLE_USER", "ROLE_PREMIUM_USER");
        assertThat(names(premium)).doesNotContain("ROLE_ADMIN", "ROLE_SUPER_ADMIN");

        List<GrantedAuthority> admin = AuthorityResolver.resolve(IdentityState.REGISTERED, userAt(UserLevel.ADMIN));
        assertThat(names(admin)).contains("ROLE_USER", "ROLE_ADMIN");
        assertThat(names(admin)).doesNotContain("ROLE_SUPER_ADMIN");
    }

    @Test
    void backedStateWithNullLevelGrantsNothing_neverDefaultsToUser() {
        User user = new User();
        user.setUserLevel(null);
        assertThat(AuthorityResolver.resolve(IdentityState.REGISTERED, user)).isEmpty();
    }

    private static User userAt(UserLevel level) {
        User user = new User();
        user.setUserLevel(level);
        return user;
    }

    private static List<String> names(List<GrantedAuthority> authorities) {
        return AuthorityUtils.authorityListToSet(authorities).stream().sorted().toList();
    }
}
