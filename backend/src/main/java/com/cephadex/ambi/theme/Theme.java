package com.cephadex.ambi.theme;

import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.common.Auditable;
import com.cephadex.ambi.common.Ownership;
import com.cephadex.ambi.common.enums.OwnershipType;
import com.cephadex.ambi.org.enums.OrgRole;
import com.cephadex.ambi.user.enums.UserLevel;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * A named, persisted, shareable theme. The colours and images live in the
 * embedded {@link ThemeSpec} — the part the UI renders; this aggregate adds the
 * identity, a human name, and ownership so themes can be listed, reused across
 * decks, and shared within an organization.
 *
 * <p>A {@link ThemeSpec} can also live inline (e.g. a user's ad-hoc custom hues)
 * without ever becoming a {@code Theme} — the document only exists once a look
 * is worth naming and keeping. Decks reference a saved theme by id
 * ({@code Deck.themeId}).
 *
 * <p>Permissions are pure functions of this theme's own state plus the
 * requester's {@code (userId, level, orgRole)} triple, exactly like
 * {@code Deck} — no I/O lives here. {@code orgRole} is the requester's role in
 * <em>this theme's</em> owning org (null if not org-owned or not a member);
 * {@code level} is the platform {@link UserLevel} (null if anonymous).
 */
@Getter
@Setter
@ToString
@Document(collection = "themes")
public class Theme extends Auditable {

    // id is inherited from BaseDocument (@Id String id). Clients may mint a UUID
    // so themes can be created optimistically, the same way decks are.

    @Field("name")
    private String name = "Untitled Theme";

    @Field("ownership")
    private Ownership ownership;

    // Denormalized, indexed mirror of an org-owned theme's owner id, so
    // "themes for this org" is a single indexed query (matches the deck pattern).
    @Indexed
    @Field("organization_id")
    private String organizationId;

    @Indexed
    @Field("creator_user_id")
    private String creatorUserId;

    // App-provided preset themes everyone can use but no one but a platform
    // admin may edit or delete.
    @Field("built_in")
    private boolean builtIn;

    @Field("spec")
    private ThemeSpec spec;

    // ── Permissions ────────────────────────────────────────────────────────────

    /** MANAGE: edit the theme's name/spec, or delete it. */
    public boolean canBeManagedBy(String userId, UserLevel level, OrgRole orgRole) {
        if (isPlatformAdmin(level)) {
            return true;
        }
        // Built-in presets are platform-curated: only an admin (handled above) touches them.
        if (builtIn) {
            return false;
        }
        if (isUserOwned()) {
            return isUserOwner(userId);
        }
        if (isOrgOwned()) {
            return orgRole == OrgRole.OWNER || orgRole == OrgRole.ADMIN;
        }
        return false;
    }

    /** VIEW: read/apply the theme. */
    public boolean canBeViewedBy(String userId, UserLevel level, OrgRole orgRole) {
        // Managers can always view; built-in presets are visible to everyone.
        if (builtIn || canBeManagedBy(userId, level, orgRole)) {
            return true;
        }
        if (isUserOwned()) {
            return isUserOwner(userId);
        }
        if (isOrgOwned()) {
            // Any member of the owning org may use the theme.
            return orgRole != null;
        }
        return false;
    }

    public boolean isUserOwned() {
        return ownership != null && ownership.type() == OwnershipType.USER;
    }

    public boolean isOrgOwned() {
        return ownership != null && ownership.type() == OwnershipType.ORGANIZATION;
    }

    private boolean isUserOwner(String userId) {
        return isUserOwned() && userId != null && userId.equals(ownership.ownerId());
    }

    private static boolean isPlatformAdmin(UserLevel level) {
        return level != null && level.hasAccessTo(UserLevel.ADMIN);
    }
}
