package com.cephadex.ambi.presentation.deck;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.common.Auditable;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.org.enums.OrgRole;
import com.cephadex.ambi.presentation.deck.enums.DeckAclRole;
import com.cephadex.ambi.presentation.deck.enums.DeckVisibility;
import com.cephadex.ambi.presentation.deck.enums.OwnershipType;
import com.cephadex.ambi.presentation.deck.enums.PublishStatus;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.user.enums.UserLevel;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@Document(collection = "decks")
// Adding this due to extending AUditable, see if we can remove later
public class Deck extends Auditable {

    // id is inherited from BaseDocument (@Id String id) — do not redeclare.
    // The id is a UUID which allows us to optimistically create decks on the
    // frontend.

    // Used for sharing, presnetations..
    @Indexed(unique = true)
    @Field("public_id")
    private String publicId;

    @Field("name")
    private String name = "Untitled Deck";

    @Field("description")
    private String description;

    @Field("cover_image")
    private AppImage coverImage;

    @Field("background_image")
    private AppImage backgroundImage;

    @Field("theme_id")
    private String themeId;

    @Version
    @Field("version")
    private Long version;

    @Field("publish_status")
    private PublishStatus publishStatus = PublishStatus.DRAFT;

    // Who, beyond the owner/editors, may view this deck — only honored once
    // PUBLISHED.
    @Field("visibility")
    private DeckVisibility visibility = DeckVisibility.PRIVATE;

    @Field("published_at")
    private Instant publishedAt;

    @Field("language")
    private String language = "en";

    @Indexed
    @Field("creator_user_id")
    private String creatorUserId;

    @Field("original_author_user_id")
    private String originalAuthorUserId;

    @Field("settings")
    private Settings.DeckSettings settings;

    @Indexed
    @Field("tags")
    private Set<String> tags = new LinkedHashSet<>();

    @Indexed
    @Field("organization_id")
    private String organizationId;

    @Field("ownership")
    private DeckOwnership ownership;

    // Explicit per-user shares (VIEWER / EDITOR). A named grant wins even over
    // DRAFT.
    @Field("acl")
    private List<DeckAccessGrant> acl = new ArrayList<>();

    @Indexed
    @Field("parent_deck_id")
    private String parentDeckId;

    @Field("stats")
    private DeckStats stats;

    // Slides are embedded — the deck is their persistence boundary, and the
    // deck's @Version guards the whole slide structure (content + order) as a unit.
    @Field("slides")
    private List<Slide> slides = new ArrayList<>();

    // ── Slides ─────────────────────────────────────────────────────────────────
    // The deck is the aggregate root: all access to its slides goes through it,
    // so these mediate the embedded list. Callers must already hold EDIT.

    public Optional<Slide> findSlide(String slideId) {
        if (slideId == null) {
            return Optional.empty();
        }
        return slides.stream().filter(s -> slideId.equals(s.getId())).findFirst();
    }

    public void addSlide(Slide slide) {
        slides.add(slide);
    }

    public boolean removeSlide(String slideId) {
        return slideId != null && slides.removeIf(s -> slideId.equals(s.getId()));
    }

    // ── Permissions ────────────────────────────────────────────────────────────
    // Pure functions of this deck's own state plus the requester's
    // (userId, level, orgRole) triple. orgRole is the requester's role in THIS
    // deck's owning org (null if not org-owned or not a member); level is the
    // platform UserLevel (null if anonymous). No I/O — see the package README.

    /** MANAGE: delete, transfer ownership, change visibility, manage the ACL. */
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

    /** EDIT: change content/metadata, publish/unpublish. */
    public boolean canBeEditedBy(String userId, UserLevel level, OrgRole orgRole) {
        if (isPlatformAdmin(level)) {
            return true;
        }
        if (isUserOwned() && isUserOwner(userId)) {
            return true;
        }
        if (isOrgOwned() && (orgRole == OrgRole.OWNER || orgRole == OrgRole.ADMIN)) {
            return true;
        }
        return aclRoleFor(userId) == DeckAclRole.EDITOR;
    }

    /** VIEW: read the deck and its slides. */
    public boolean canBeViewedBy(String userId, UserLevel level, OrgRole orgRole) {
        // Editors (incl. platform admins and ACL editors) always view, even drafts.
        if (canBeEditedBy(userId, level, orgRole)) {
            return true;
        }
        // A named ACL share (VIEWER) is intentional and wins over DRAFT.
        if (aclRoleFor(userId) != null) {
            return true;
        }
        // Beyond the owner/editors/ACL, nothing unpublished is visible.
        if (publishStatus != PublishStatus.PUBLISHED) {
            return false;
        }
        return switch (visibility) {
            case PUBLIC, UNLISTED -> true;
            case ORG -> isOrgOwned() && orgRole != null;
            case PRIVATE -> false;
        };
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

    private DeckAclRole aclRoleFor(String userId) {
        if (userId == null || acl == null) {
            return null;
        }
        for (DeckAccessGrant grant : acl) {
            if (userId.equals(grant.userId())) {
                return grant.role();
            }
        }
        return null;
    }

    private static boolean isPlatformAdmin(UserLevel level) {
        return level != null && level.hasAccessTo(UserLevel.ADMIN);
    }

}
