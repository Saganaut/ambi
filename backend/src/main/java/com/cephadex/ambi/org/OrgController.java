package com.cephadex.ambi.org;

import static com.cephadex.ambi.auth.security.AmbiPrincipals.requireUserId;

import java.util.Collections;
import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.org.dto.MyOrgMembershipResponse;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;

/**
 * Read surface for organization membership. There is no {@code Organization}
 * aggregate yet — memberships live embedded on the {@link User} — so this is a
 * thin projection of the caller's own {@code orgRoles}, not full org CRUD.
 *
 * <p>It exists to back the "owner" selectors in the theme and gallery creators:
 * the client lists the caller's memberships and offers the orgs they may create
 * shared content for. Identity comes from the principal, never from input.
 */
@RestController
@RequestMapping("/api/orgs")
public class OrgController {

    private final UserService userService;

    public OrgController(UserService userService) {
        this.userService = userService;
    }

    /** The caller's organization memberships (org id + their role in each). */
    @GetMapping("/mine")
    public List<MyOrgMembershipResponse> listMyOrgs(
            @AuthenticationPrincipal AmbiPrincipal principal) {
        String userId = requireUserId(principal);
        List<OrgMembership> memberships = userService.findById(userId)
                .map(u -> u.getOrgRoles())
                .orElse(Collections.emptyList());
        if (memberships == null) {
            return List.of();
        }
        return memberships.stream().map(MyOrgMembershipResponse::from).toList();
    }
}
