package com.cephadex.ambi.org;

import java.util.Optional;

import org.springframework.stereotype.Component;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.auth.security.AmbiPrincipals;
import com.cephadex.ambi.common.OwnableResource;
import com.cephadex.ambi.org.enums.OrgRole;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;

/**
 * Resolves the role a requester holds in a resource's owning organization — the
 * one org-membership lookup the ownership-gated services ({@code DeckService},
 * {@code GalleryService}, {@code ThemeService}) all need. Extracted so the lookup
 * (and its null-handling edge cases) live in one place rather than drifting across
 * three copies.
 *
 * <p>Returns null whenever a role cannot apply — a personal resource, an
 * anonymous requester, or a user with no membership in the org — so callers can
 * feed the result straight into an aggregate's {@code canBe*By} predicate.
 */
@Component
public class OrgRoleResolver {

    private final UserService userService;

    public OrgRoleResolver(UserService userService) {
        this.userService = userService;
    }

    /**
     * The principal's role in the resource's owning org, or null. Skips the user
     * lookup entirely for personal (non-org-owned) resources.
     */
    public OrgRole roleFor(OwnableResource resource, AmbiPrincipal principal) {
        if (resource == null || !resource.isOrgOwned()) {
            return null;
        }
        return roleFor(resource.getOrganizationId(), AmbiPrincipals.userId(principal));
    }

    /** A user's role in a given org, or null if either id is absent or there is no membership. */
    public OrgRole roleFor(String orgId, String userId) {
        if (orgId == null || userId == null) {
            return null;
        }
        Optional<User> user = userService.findById(userId);
        if (user.isEmpty() || user.get().getOrgRoles() == null) {
            return null;
        }
        for (OrgMembership membership : user.get().getOrgRoles()) {
            if (orgId.equals(membership.orgId())) {
                return membership.orgRole();
            }
        }
        return null;
    }
}
