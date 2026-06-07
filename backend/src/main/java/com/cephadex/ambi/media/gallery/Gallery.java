package com.cephadex.ambi.media.gallery;

import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
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
 * A media gallery: the durable home for a single owner's uploaded images (and,
 * later, audio). Each user has exactly one; an organization may own one too,
 * reusing the same {@link Ownership} model as decks and themes. The gallery is
 * the source a user browses to <em>select</em> an image to use as a deck/slide
 * background, an avatar, a theme asset, and so on — the chosen image's
 * {@code AppImage} value is then <em>copied</em> into that usage site, so the
 * gallery stays the picker, never the live-resolution source.
 *
 * <p>The images themselves are <em>not</em> embedded here — they are their own
 * {@link GalleryImage} documents keyed by {@code galleryId}, so a gallery can
 * grow without bound and its images paginate independently of the container.
 *
 * <p>Permissions are pure functions of this gallery's own state plus the
 * requester's {@code (userId, level, orgRole)} triple, exactly like
 * {@code Deck} and {@code Theme} — no I/O lives here. There is no per-user ACL:
 * a whole gallery is not shared, individual images are selected. {@code orgRole}
 * is the requester's role in <em>this gallery's</em> owning org (null if not
 * org-owned or not a member); {@code level} is the platform {@link UserLevel}
 * (null if anonymous).
 */
@Getter
@Setter
@ToString
@Document(collection = "galleries")
// One gallery per owner: a user (or org) can only ever have a single gallery.
@CompoundIndex(name = "owner_unique", def = "{'ownership.type': 1, 'ownership.owner_id': 1}", unique = true)
public class Gallery extends Auditable {

    // id is inherited from BaseDocument (@Id String id). The id is server-minted
    // on get-or-create; clients reach a gallery via /mine or ?orgId, not by id.

    @Field("name")
    private String name = "My Gallery";

    @Field("ownership")
    private Ownership ownership;

    // Denormalized, indexed mirror of an org-owned gallery's owner id, so
    // "the gallery for this org" is a single indexed query (matches deck/theme).
    @Indexed
    @Field("organization_id")
    private String organizationId;

    @Indexed
    @Field("creator_user_id")
    private String creatorUserId;

    @Version
    @Field("version")
    private Long version;

    // ── Permissions ────────────────────────────────────────────────────────────
    // VIEW = browse/select images; EDIT = add/remove images (the upload pipeline
    // grows into EDIT); MANAGE = rename or delete the whole gallery.

    /** MANAGE: rename or delete the gallery. */
    public boolean canBeManagedBy(String userId, UserLevel level, OrgRole orgRole) {
        if (isPlatformAdmin(level)) {
            return true;
        }
        if (isUserOwned()) {
            return isUserOwner(userId);
        }
        if (isOrgOwned()) {
            return orgRole == OrgRole.OWNER;
        }
        return false;
    }

    /** EDIT: add or remove images. */
    public boolean canBeEditedBy(String userId, UserLevel level, OrgRole orgRole) {
        if (isPlatformAdmin(level)) {
            return true;
        }
        if (isUserOwned()) {
            return isUserOwner(userId);
        }
        if (isOrgOwned()) {
            return orgRole == OrgRole.OWNER || orgRole == OrgRole.ADMIN;
        }
        return false;
    }

    /** VIEW: browse the gallery and select images from it. */
    public boolean canBeViewedBy(String userId, UserLevel level, OrgRole orgRole) {
        if (canBeEditedBy(userId, level, orgRole)) {
            return true;
        }
        if (isOrgOwned()) {
            // Any member of the owning org may browse and select from its gallery.
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
