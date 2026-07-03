package com.cephadex.ambi.presentation.deck;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.common.Auditable;
import com.cephadex.ambi.common.OwnableResource;
import com.cephadex.ambi.common.Ownership;
import com.cephadex.ambi.common.enums.OwnershipType;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.org.enums.OrgRole;
import com.cephadex.ambi.presentation.deck.enums.DeckAclRole;
import com.cephadex.ambi.presentation.deck.enums.DeckVisibility;
import com.cephadex.ambi.presentation.deck.enums.PublishStatus;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.SlideRankService;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.user.enums.UserLevel;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@Document(collection = "decks")
// Adding this due to extending AUditable, see if we can remove later
public class Deck extends Auditable implements OwnableResource {

    // id is inherited from BaseDocument (@Id String id) — do not redeclare.
    // The id is a UUID which allows us to optimistically create decks on the
    // frontend.

    // Used for sharing, presnetations..
    @Indexed(unique = true)
    @Field("public_id")
    private String publicId;

    // Name/language defaults are owned by DeckDefaultsProperties and applied at
    // the create seam (DeckService.create) so they stay env-tunable in one place.
    @Field("name")
    private String name;

    @Field("label")
    private String label; // to appear above the name/title

    @Field("description")
    private String description;

    @Field("cover_image")
    private AppImage coverImage;


    // Background image is the slides background images
    // If set applies to all slides, but indivudal slides can supercede
    @Field("background_image")
    private AppImage backgroundImage;

    // Deck-wide default background color (hex "#RRGGBB"), the color counterpart
    // to backgroundImage. If set, every slide inherits it unless the slide
    // overrides it with its own backgroundColor or suppresses inheritance via
    // hideBackground. Composes behind the background image when both are present.
    @Field("background_color")
    private String backgroundColor;

    @Field("theme_id")
    private String themeId;

    @Version
    @Field("version")
    private Long version;

    // DRAFT/PRIVATE are deliberately kept as field defaults rather than moved to
    // config: they are safety invariants (a new deck must never default to
    // published/public), so they are not env-tunable on purpose.
    @Field("publish_status")
    private PublishStatus publishStatus = PublishStatus.DRAFT;

    // Who, beyond the owner/editors, may view this deck — only honored once
    // PUBLISHED.
    @Field("visibility")
    private DeckVisibility visibility = DeckVisibility.PRIVATE;

    @Field("published_at")
    private Instant publishedAt;

    @Field("language")
    private String language;

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
    private Ownership ownership;

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
        if (slideId == null) {
            return false;
        }
        Slide removed = findSlide(slideId).orElse(null);
        if (removed == null) {
            return false;
        }
        // Removing a parent cascades to its attached follow-up — a follow-up
        // without its parent's submissions is meaningless at runtime. A link
        // that fails the attachment check (dangling target, mismatched
        // back-pointer, non-follow-up content — legacy data) doesn't cascade;
        // its back-pointer is just cleared so nothing references the removed
        // slide.
        attachedFollowUp(removed).ifPresent(slides::remove);
        if (removed.getChildId() != null) {
            findSlide(removed.getChildId()).ifPresent(child -> {
                if (slideId.equals(child.getParentId())) {
                    child.setParentId(null);
                }
            });
        }
        if (removed.getParentId() != null) {
            findSlide(removed.getParentId()).ifPresent(parent -> {
                if (slideId.equals(parent.getChildId())) {
                    parent.setChildId(null);
                }
            });
        }
        return slides.remove(removed);
    }

    // ── Follow-up linkage ────────────────────────────────────────────────────────
    // A parent/follow-up link is real only when both back-pointers agree AND the
    // child's content is FollowUpContent. Anything else (legacy client-written
    // links, dangling ids) degrades to plain unlinked slides everywhere below.

    /**
     * The slide's attached follow-up, if its {@code childId} names a valid one:
     * the child exists, points back, and carries {@link FollowUpContent}.
     */
    public Optional<Slide> attachedFollowUp(Slide slide) {
        if (slide == null || slide.getChildId() == null) {
            return Optional.empty();
        }
        return findSlide(slide.getChildId())
                .filter(child -> slide.getId() != null && slide.getId().equals(child.getParentId()))
                .filter(child -> child.getContent() instanceof FollowUpContent);
    }

    /** Whether the slide is itself a valid attached follow-up of some parent. */
    public boolean isAttachedFollowUp(Slide slide) {
        if (slide == null || slide.getParentId() == null
                || !(slide.getContent() instanceof FollowUpContent)) {
            return false;
        }
        return findSlide(slide.getParentId())
                .map(parent -> slide.getId() != null && slide.getId().equals(parent.getChildId()))
                .orElse(false);
    }

    /**
     * Link {@code followUp} to {@code parent} and place it immediately after it
     * in the sorted order, minting only the new slide's key (between the parent
     * and its successor, rebalancing first if those neighbours have no gap).
     * Callers must have validated eligibility and run
     * {@link #backfillRanks(SlideRankService)} so the parent is keyed.
     */
    public void addFollowUp(Slide followUp, Slide parent, SlideRankService ranks) {
        followUp.setParentId(parent.getId());
        parent.setChildId(followUp.getId());

        List<Slide> ordered = slides.stream().sorted(SlideRankService.ordering()).toList();
        int parentIdx = ordered.indexOf(parent);
        Slide successor = parentIdx + 1 < ordered.size() ? ordered.get(parentIdx + 1) : null;
        String rank;
        if (successor == null) {
            rank = ranks.after(parent.getSortOrder());
        } else {
            if (!ranks.hasGap(parent.getSortOrder(), successor.getSortOrder())) {
                rebalance(ordered, ranks);
            }
            rank = ranks.between(parent.getSortOrder(), successor.getSortOrder());
        }
        followUp.setSortOrder(rank);
        slides.add(followUp);
        resort();
    }

    // ── Slide ordering (Lexorank) ────────────────────────────────────────────────
    // sortOrder is the authoritative order; the embedded array is kept sorted to
    // match it (the whole deck doc is rewritten on every save anyway, so the
    // in-memory resort is free and keeps every read path — including verbatim
    // session snapshots — correct without remembering to sort). All key math is
    // delegated to SlideRankService so the aggregate never touches lexorank4j.

    /**
     * The highest {@code sortOrder} present, or {@code null} if no slide has one.
     */
    public String maxSortOrder() {
        return slides.stream()
                .map(s -> s.getSortOrder())
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
    }

    /**
     * The lowest {@code sortOrder} present, or {@code null} if no slide has one.
     */
    public String minSortOrder() {
        return slides.stream()
                .map(s -> s.getSortOrder())
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElse(null);
    }

    /**
     * Sort the embedded slide list in place by {@code sortOrder} (nulls last, id
     * tie-break).
     */
    public void resort() {
        slides.sort(SlideRankService.ordering());
    }

    /**
     * Assign keys to any slide missing a {@code sortOrder}. If even one is
     * missing we respace the <em>whole</em> list by its current array order — the
     * documented fallback ordering — so the result is deterministic and free of
     * collisions whether the deck is fully legacy (all null) or partially keyed.
     * A no-op once every slide is keyed.
     */
    public void backfillRanks(SlideRankService ranks) {
        if (slides.stream().allMatch(s -> s.getSortOrder() != null)) {
            return;
        }
        List<String> fresh = ranks.evenlySpaced(slides.size());
        for (int i = 0; i < slides.size(); i++) {
            slides.get(i).setSortOrder(fresh.get(i));
        }
    }

    /**
     * Move the unit anchored at {@code slideId} — the slide plus its attached
     * follow-up, if any — to {@code toIndex} in the sorted order, rewriting only
     * the moved unit's keys. {@code toIndex} counts slides (not units) over the
     * rest of the deck and is normalized so the unit can never land inside
     * another parent/follow-up pair: an index that would split a pair snaps past
     * it, and out-of-range values clamp. Moving a slide that is itself an
     * attached follow-up is a no-op (the pair moves via its parent; the service
     * rejects such requests upstream). If the destination neighbours have no
     * representable gap the rest of the list is rebalanced first.
     *
     * @param slideId the unit head to move
     * @param toIndex the destination position counted in slides
     * @param ranks   the key generator
     */
    public void reorderUnit(String slideId, int toIndex, SlideRankService ranks) {
        Slide head = findSlide(slideId).orElse(null);
        if (head == null || isAttachedFollowUp(head)) {
            return;
        }
        Slide movedChild = attachedFollowUp(head).orElse(null);

        // The index space is the OTHER slides, in sorted order, grouped into
        // units so the destination can be snapped to a unit boundary.
        List<Slide> others = slides.stream()
                .filter(s -> s != head && s != movedChild)
                .sorted(SlideRankService.ordering())
                .toList();
        List<List<Slide>> units = groupIntoUnits(others);

        // Normalize the flat slide index to a unit boundary: an index that
        // falls inside a pair snaps to just after it.
        int unitTarget = 0;
        int flat = 0;
        for (List<Slide> unit : units) {
            if (toIndex <= flat) {
                break;
            }
            flat += unit.size();
            unitTarget++;
        }

        String headRank;
        String childRank = null;
        if (others.isEmpty()) {
            headRank = ranks.initial();
            childRank = movedChild == null ? null : ranks.after(headRank);
        } else if (unitTarget == 0) {
            String upper = units.get(0).get(0).getSortOrder();
            headRank = ranks.before(upper);
            childRank = movedChild == null ? null : ranks.between(headRank, upper);
        } else if (unitTarget == units.size()) {
            List<Slide> lastUnit = units.get(units.size() - 1);
            headRank = ranks.after(lastUnit.get(lastUnit.size() - 1).getSortOrder());
            childRank = movedChild == null ? null : ranks.after(headRank);
        } else {
            List<Slide> lowerUnit = units.get(unitTarget - 1);
            Slide lower = lowerUnit.get(lowerUnit.size() - 1);
            Slide upper = units.get(unitTarget).get(0);
            if (!ranks.hasGap(lower.getSortOrder(), upper.getSortOrder())) {
                rebalance(others, ranks);
            }
            headRank = ranks.between(lower.getSortOrder(), upper.getSortOrder());
            childRank = movedChild == null ? null : ranks.between(headRank, upper.getSortOrder());
        }
        head.setSortOrder(headRank);
        if (movedChild != null) {
            movedChild.setSortOrder(childRank);
        }
        resort();
    }

    /**
     * Group an already-sorted run of slides into units: a parent immediately
     * followed (logically) by its valid attached follow-up forms one unit;
     * every other slide — including ones with dangling or half-written links —
     * is a unit of its own. Only pairs whose both halves are present in
     * {@code ordered} are grouped.
     */
    private List<List<Slide>> groupIntoUnits(List<Slide> ordered) {
        Set<String> presentIds = new HashSet<>();
        for (Slide s : ordered) {
            presentIds.add(s.getId());
        }
        Set<String> attachedChildIds = new HashSet<>();
        for (Slide s : ordered) {
            attachedFollowUp(s).ifPresent(child -> {
                if (presentIds.contains(child.getId())) {
                    attachedChildIds.add(child.getId());
                }
            });
        }
        List<List<Slide>> units = new ArrayList<>();
        for (Slide s : ordered) {
            if (attachedChildIds.contains(s.getId())) {
                continue; // emitted as part of its parent's unit
            }
            Slide child = attachedFollowUp(s)
                    .filter(c -> attachedChildIds.contains(c.getId()))
                    .orElse(null);
            units.add(child == null ? List.of(s) : List.of(s, child));
        }
        return units;
    }

    /** Respace an already-sorted run of slides with fresh, evenly-stepped keys. */
    private void rebalance(List<Slide> ordered, SlideRankService ranks) {
        List<String> fresh = ranks.evenlySpaced(ordered.size());
        for (int i = 0; i < ordered.size(); i++) {
            ordered.get(i).setSortOrder(fresh.get(i));
        }
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
