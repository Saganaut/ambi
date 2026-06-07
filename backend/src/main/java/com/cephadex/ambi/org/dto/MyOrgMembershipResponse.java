package com.cephadex.ambi.org.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.cephadex.ambi.org.OrgMembership;
import com.cephadex.ambi.org.enums.OrgRole;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The wire view of one of the caller's organization memberships. There is no
 * {@code Organization} aggregate yet, so this carries only what a membership
 * actually holds — the org id and the caller's role in it. A human-facing org
 * name will join this once organizations become a first-class document.
 *
 * <p>Drives the theme/gallery "owner" pickers: a client lists these to offer the
 * orgs a user may create shared content for (role {@code OWNER}/{@code ADMIN}).
 *
 * @param orgId the organization's id
 * @param role  the caller's role within that organization
 */
public record MyOrgMembershipResponse(
        @Schema(requiredMode = REQUIRED) String orgId,
        @Schema(requiredMode = REQUIRED) OrgRole role) {

    public static MyOrgMembershipResponse from(OrgMembership membership) {
        return new MyOrgMembershipResponse(membership.orgId(), membership.orgRole());
    }
}
