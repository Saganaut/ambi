package com.cephadex.ambi.common;

/**
 * A document whose access is decided by ownership: it is owned either by a user
 * or by an organization, and org-owned instances resolve the requester's role in
 * that org. Implemented by the ownership aggregates ({@code Deck}, {@code Gallery},
 * {@code Theme}) so shared access-control plumbing — chiefly
 * {@link com.cephadex.ambi.org.OrgRoleResolver} — can resolve an org role without
 * knowing the concrete type.
 *
 * <p>The capability predicates themselves ({@code canBeViewedBy} etc.) stay on each
 * aggregate: they differ per resource and are intentionally not part of this
 * contract.
 */
public interface OwnableResource {

    /** The owning principal (a user or an organization), or null before assignment. */
    Ownership getOwnership();

    /** The owning organization's id when {@link #isOrgOwned()}, else null. */
    String getOrganizationId();

    /** Whether this resource is owned by an organization rather than a user. */
    boolean isOrgOwned();
}
