package com.cephadex.ambi.org;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.OwnableResource;
import com.cephadex.ambi.org.enums.OrgRole;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * The org-role lookup extracted from the ownership services. These pin its
 * contract directly — every null/empty branch and the membership match — rather
 * than leaning on the three service tests that exercise it indirectly.
 */
class OrgRoleResolverTest {

    private final UserService userService = mock(UserService.class);
    private final OrgRoleResolver resolver = new OrgRoleResolver(userService);

    // ── roleFor(orgId, userId) ──────────────────────────────────────────────

    @Test
    void nullOrgIdShortCircuitsWithoutLookup() {
        assertThat(resolver.roleFor(null, "user-1")).isNull();
        verifyNoInteractions(userService);
    }

    @Test
    void nullUserIdShortCircuitsWithoutLookup() {
        assertThat(resolver.roleFor("org-1", null)).isNull();
        verifyNoInteractions(userService);
    }

    @Test
    void unknownUserResolvesToNull() {
        when(userService.findById("ghost")).thenReturn(Optional.empty());
        assertThat(resolver.roleFor("org-1", "ghost")).isNull();
    }

    @Test
    void userWithNoMembershipsResolvesToNull() {
        User user = userWithId("user-1");
        user.setOrgRoles(null);
        when(userService.findById("user-1")).thenReturn(Optional.of(user));
        assertThat(resolver.roleFor("org-1", "user-1")).isNull();
    }

    @Test
    void noMatchingOrgResolvesToNull() {
        User user = userWithId("user-1");
        user.setOrgRoles(List.of(new OrgMembership("other-org", OrgRole.OWNER)));
        when(userService.findById("user-1")).thenReturn(Optional.of(user));
        assertThat(resolver.roleFor("org-1", "user-1")).isNull();
    }

    @Test
    void matchingMembershipResolvesToItsRole() {
        User user = userWithId("user-1");
        user.setOrgRoles(List.of(
                new OrgMembership("other-org", OrgRole.OWNER),
                new OrgMembership("org-1", OrgRole.ADMIN)));
        when(userService.findById("user-1")).thenReturn(Optional.of(user));
        assertThat(resolver.roleFor("org-1", "user-1")).isEqualTo(OrgRole.ADMIN);
    }

    // ── roleFor(resource, principal) ────────────────────────────────────────

    @Test
    void nullResourceShortCircuitsWithoutLookup() {
        assertThat(resolver.roleFor((OwnableResource) null, principal("user-1"))).isNull();
        verifyNoInteractions(userService);
    }

    @Test
    void personalResourceShortCircuitsWithoutLookup() {
        OwnableResource personal = mock(OwnableResource.class);
        when(personal.isOrgOwned()).thenReturn(false);

        assertThat(resolver.roleFor(personal, principal("user-1"))).isNull();
        verifyNoInteractions(userService);
    }

    @Test
    void orgResourceResolvesViaOrganizationIdAndPrincipal() {
        OwnableResource orgOwned = mock(OwnableResource.class);
        when(orgOwned.isOrgOwned()).thenReturn(true);
        when(orgOwned.getOrganizationId()).thenReturn("org-1");
        User user = userWithId("user-1");
        user.setOrgRoles(List.of(new OrgMembership("org-1", OrgRole.OWNER)));
        when(userService.findById("user-1")).thenReturn(Optional.of(user));

        assertThat(resolver.roleFor(orgOwned, principal("user-1"))).isEqualTo(OrgRole.OWNER);
    }

    private static User userWithId(String userId) {
        User user = new User();
        user.setId(userId);
        return user;
    }

    private static AmbiPrincipal principal(String userId) {
        return new AmbiPrincipal(IdentityState.REGISTERED, userId, "pub-" + userId,
                UserLevel.USER, AuthProvider.INTERNAL, null, null, "sid-" + userId);
    }
}
