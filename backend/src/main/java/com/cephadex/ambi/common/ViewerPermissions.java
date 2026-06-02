package com.cephadex.ambi.common;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The capabilities the <em>requesting</em> principal has over a resource,
 * computed server-side from the aggregate's permission predicates and attached
 * to its response. The client reads these booleans to decide which affordances
 * to show (edit, delete, share); the backend stays the single source of truth.
 *
 * <p>This exists because the client cannot evaluate the rules itself: ownership
 * and ACL entries are keyed by the internal user id (the client only holds the
 * public id), and org-owned access depends on the requester's org role, which
 * the client does not carry.
 *
 * <p>For resources with no edit/manage split (e.g. themes) {@code canEdit}
 * mirrors {@code canManage}.
 *
 * @param canView   the requester may read the resource
 * @param canEdit   the requester may change its content / metadata
 * @param canManage the requester may delete it, change visibility, and manage sharing
 */
public record ViewerPermissions(
        @Schema(requiredMode = REQUIRED) boolean canView,
        @Schema(requiredMode = REQUIRED) boolean canEdit,
        @Schema(requiredMode = REQUIRED) boolean canManage) {
}
