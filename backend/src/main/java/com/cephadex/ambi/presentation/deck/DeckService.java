package com.cephadex.ambi.presentation.deck;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.ViewerPermissions;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.common.exception.UnauthorizedException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.org.OrgMembership;
import com.cephadex.ambi.org.enums.OrgRole;
import com.cephadex.ambi.presentation.deck.dto.DeckResponse;
import com.cephadex.ambi.presentation.deck.enums.DeckAclRole;
import com.cephadex.ambi.presentation.deck.enums.DeckVisibility;
import com.cephadex.ambi.presentation.deck.enums.OwnershipType;
import com.cephadex.ambi.presentation.deck.enums.PublishStatus;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.SlideRankService;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * CRUD for {@link Deck}, gated by the permission rules in the package README.
 * The aggregate owns the rules ({@code canBeViewedBy} / {@code canBeEditedBy} /
 * {@code canBeManagedBy}); this service decides which capability an operation
 * needs, resolves the requester's org role, and turns a denial into a typed
 * {@code ApiException}.
 */
@Service
public class DeckService {

    private final DeckRepository deckRepository;
    private final UserService userService;
    private final SlideRankService rankService;

    public DeckService(DeckRepository deckRepository, UserService userService,
            SlideRankService rankService) {
        this.deckRepository = deckRepository;
        this.userService = userService;
        this.rankService = rankService;
    }

    // ── Create ──────────────────────────────────────────────────────────────

    /**
     * Optimistic creation: the client mints the deck's UUID and we persist a
     * fresh personal deck owned by the caller, with the aggregate's field
     * defaults (name, {@code PRIVATE} visibility, {@code DRAFT} status, …).
     */
    public Deck create(String id, AmbiPrincipal principal) {
        String userId = requireUserId(principal);

        Deck deck = new Deck();
        deck.setId(id);
        deck.setOwnership(new DeckOwnership(OwnershipType.USER, userId));
        deck.setCreatorUserId(userId);
        deck.setOriginalAuthorUserId(userId);
        deck.setPublicId(UUID.randomUUID().toString());

        return deckRepository.save(deck);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    /** Load a deck the requester is allowed to VIEW, else 403/404. */
    public Deck getViewable(String id, AmbiPrincipal principal) {
        Deck deck = load(id);
        requireView(deck, principal);
        return deck;
    }

    /** Load a deck the requester is allowed to EDIT, else 403/404. */
    public Deck getEditable(String id, AmbiPrincipal principal) {
        Deck deck = load(id);
        requireEdit(deck, principal);
        return deck;
    }

    // ── Update ──────────────────────────────────────────────────────────────

    /**
     * Replace the editable content/metadata of a deck (EDIT capability).
     * Cover and background images are intentionally untouched — they have a
     * single owner in the image methods below, so existing images survive a
     * metadata edit. Ownership, visibility, ACL and identifiers are likewise
     * untouched; those flow through the MANAGE-gated methods.
     */
    public Deck update(String id, Deck changes, AmbiPrincipal principal) {
        Deck deck = getEditable(id, principal);

        deck.setName(changes.getName());
        deck.setDescription(changes.getDescription());
        deck.setThemeId(changes.getThemeId());
        deck.setLanguage(changes.getLanguage());
        deck.setSettings(changes.getSettings());
        deck.setTags(changes.getTags());
        applyPublishStatus(deck, changes.getPublishStatus());

        return deckRepository.save(deck);
    }

    // ── Slides ────────────────────────────────────────────────────────────────
    // Slides are embedded in the deck, so a slide operation IS a deck operation:
    // gate on the deck's VIEW/EDIT, mutate the embedded list, save the deck.

    /**
     * A deck's slides in {@code sortOrder}, with unkeyed legacy slides last (VIEW).
     */
    public List<Slide> listSlides(String deckId, AmbiPrincipal principal) {
        return getViewable(deckId, principal).getSlides().stream()
                .sorted(SlideRankService.ordering())
                .toList();
    }

    /** A single slide of a deck (VIEW). */
    public Slide getSlide(String deckId, String slideId, AmbiPrincipal principal) {
        return getViewable(deckId, principal).findSlide(slideId)
                .orElseThrow(() -> new NotFoundException("SLIDE_NOT_FOUND", "Slide not found"));
    }

    /**
     * Append a slide to a deck (EDIT). Optimistic: the client may mint the
     * slide's {@code id} (the stable handle the session layer keys on); we
     * stamp audit fields. We mint the id only if the client omitted it.
     */
    public Slide addSlide(String deckId, Slide slide, AmbiPrincipal principal) {
        Deck deck = getEditable(deckId, principal);
        String userId = principal.userId();
        if (slide.getId() == null) {
            slide.setId(UUID.randomUUID().toString());
        }
        slide.setCreatedByUserId(userId);
        slide.setLastEditedByUserId(userId);
        // Ordering is server-owned: key any legacy slides, then append past the
        // current last. Any client-supplied sortOrder is ignored on purpose.
        deck.backfillRanks(rankService);
        slide.setSortOrder(rankService.after(deck.maxSortOrder()));
        deck.addSlide(slide);
        deck.resort();
        deckRepository.save(deck);
        return slide;
    }

    /** Replace a slide's editable presentation fields (EDIT). */
    public Slide updateSlide(String deckId, String slideId, Slide changes, AmbiPrincipal principal) {
        Deck deck = getEditable(deckId, principal);
        Slide slide = deck.findSlide(slideId)
                .orElseThrow(() -> new NotFoundException("SLIDE_NOT_FOUND", "Slide not found"));

        slide.setTitle(changes.getTitle());
        slide.setSection(changes.getSection());
        slide.setParentId(changes.getParentId());
        slide.setChildId(changes.getChildId());
        // sortOrder is server-owned and unchanged here — reordering goes through
        // moveSlide, so an update never lets the client jump a slide's position.
        slide.setContent(changes.getContent());
        slide.setLastEditedByUserId(principal.userId());

        deck.backfillRanks(rankService);
        deck.resort();
        deckRepository.save(deck);
        return slide;
    }

    /**
     * Move a slide to {@code toIndex} in the deck's order (EDIT). Only the moved
     * slide's {@code sortOrder} is rewritten; returns the full deck so the caller
     * can echo the canonical {@link DeckResponse} back to the client.
     */
    public Deck moveSlide(String deckId, String slideId, int toIndex, AmbiPrincipal principal) {
        Deck deck = getEditable(deckId, principal);
        Slide slide = deck.findSlide(slideId)
                .orElseThrow(() -> new NotFoundException("SLIDE_NOT_FOUND", "Slide not found"));

        deck.backfillRanks(rankService);
        deck.reorderSlide(slideId, toIndex, rankService);
        slide.setLastEditedByUserId(principal.userId());

        return deckRepository.save(deck);
    }

    /** Remove a slide from a deck (EDIT). */
    public void removeSlide(String deckId, String slideId, AmbiPrincipal principal) {
        Deck deck = getEditable(deckId, principal);
        if (!deck.removeSlide(slideId)) {
            throw new NotFoundException("SLIDE_NOT_FOUND", "Slide not found");
        }
        deckRepository.save(deck);
    }

    // ── Images ────────────────────────────────────────────────────────────────
    // Cover/background images get a dedicated home so attaching one is a single,
    // explicit operation — and the future upload pipeline has a route to grow
    // into — while a metadata/slide edit can never clobber them. PUT sets, the
    // clear* methods null the slot. Slides are embedded, so a slide image change
    // saves the whole deck, exactly like updateSlide.

    /** Set a deck's cover image (EDIT). */
    public Deck setDeckCoverImage(String id, AppImage image, AmbiPrincipal principal) {
        return applyDeckImage(id, principal, deck -> deck.setCoverImage(image));
    }

    /** Clear a deck's cover image (EDIT). */
    public Deck clearDeckCoverImage(String id, AmbiPrincipal principal) {
        return applyDeckImage(id, principal, deck -> deck.setCoverImage(null));
    }

    /** Set a deck's background image (EDIT). */
    public Deck setDeckBackgroundImage(String id, AppImage image, AmbiPrincipal principal) {
        return applyDeckImage(id, principal, deck -> deck.setBackgroundImage(image));
    }

    /** Clear a deck's background image (EDIT). */
    public Deck clearDeckBackgroundImage(String id, AmbiPrincipal principal) {
        return applyDeckImage(id, principal, deck -> deck.setBackgroundImage(null));
    }

    /** Set a slide's cover image (EDIT). */
    public Slide setSlideCoverImage(String deckId, String slideId, AppImage image, AmbiPrincipal principal) {
        return applySlideImage(deckId, slideId, principal, slide -> slide.setCoverImage(image));
    }

    /** Clear a slide's cover image (EDIT). */
    public Slide clearSlideCoverImage(String deckId, String slideId, AmbiPrincipal principal) {
        return applySlideImage(deckId, slideId, principal, slide -> slide.setCoverImage(null));
    }

    /** Set a slide's background image (EDIT). */
    public Slide setSlideBackgroundImage(String deckId, String slideId, AppImage image, AmbiPrincipal principal) {
        return applySlideImage(deckId, slideId, principal, slide -> slide.setBackgroundImage(image));
    }

    /** Clear a slide's background image (EDIT). */
    public Slide clearSlideBackgroundImage(String deckId, String slideId, AmbiPrincipal principal) {
        return applySlideImage(deckId, slideId, principal, slide -> slide.setBackgroundImage(null));
    }

    private Deck applyDeckImage(String id, AmbiPrincipal principal, Consumer<Deck> mutation) {
        Deck deck = getEditable(id, principal);
        mutation.accept(deck);
        return deckRepository.save(deck);
    }

    private Slide applySlideImage(String deckId, String slideId, AmbiPrincipal principal,
            Consumer<Slide> mutation) {
        Deck deck = getEditable(deckId, principal);
        Slide slide = deck.findSlide(slideId)
                .orElseThrow(() -> new NotFoundException("SLIDE_NOT_FOUND", "Slide not found"));
        mutation.accept(slide);
        slide.setLastEditedByUserId(principal.userId());
        deck.backfillRanks(rankService);
        deck.resort();
        deckRepository.save(deck);
        return slide;
    }

    // ── Manage ────────────────────────────────────────────────────────────────

    /** Change a deck's visibility (MANAGE capability). */
    public Deck setVisibility(String id, DeckVisibility visibility, AmbiPrincipal principal) {
        Deck deck = load(id);
        requireManage(deck, principal);
        deck.setVisibility(visibility);
        return deckRepository.save(deck);
    }

    /** Grant (or update) an explicit per-user share (MANAGE capability). */
    public Deck share(String id, String granteeUserId, DeckAclRole role, AmbiPrincipal principal) {
        Deck deck = load(id);
        requireManage(deck, principal);
        deck.getAcl().removeIf(grant -> granteeUserId.equals(grant.userId()));
        deck.getAcl().add(new DeckAccessGrant(granteeUserId, role));
        return deckRepository.save(deck);
    }

    /** Revoke an explicit per-user share (MANAGE capability). */
    public Deck revokeShare(String id, String granteeUserId, AmbiPrincipal principal) {
        Deck deck = load(id);
        requireManage(deck, principal);
        deck.getAcl().removeIf(grant -> granteeUserId.equals(grant.userId()));
        return deckRepository.save(deck);
    }

    /** Delete a deck (MANAGE capability). Embedded slides go with it. */
    public void delete(String id, AmbiPrincipal principal) {
        Deck deck = load(id);
        requireManage(deck, principal);
        deckRepository.delete(deck);
    }

    // ── Listing ───────────────────────────────────────────────────────────────

    /** Decks personally owned by a user. */
    public List<Deck> listOwnedByUser(String userId) {
        return deckRepository.findByOwnershipTypeAndOwnershipOwnerId(OwnershipType.USER, userId);
    }

    /** Decks owned by an org — requires the requester to be a member of it. */
    public List<Deck> listForOrg(String orgId, AmbiPrincipal principal) {
        if (!isPlatformAdmin(principal) && orgRoleFor(orgId, userId(principal)) == null) {
            throw new ForbiddenException("DECK_VIEW_FORBIDDEN",
                    "You are not a member of this organization");
        }
        return deckRepository.findByOrganizationId(orgId);
    }

    /** Publicly discoverable decks ({@code PUBLIC} + {@code PUBLISHED}). */
    public Page<Deck> listPublic(Pageable pageable) {
        return deckRepository.findByVisibilityAndPublishStatus(
                DeckVisibility.PUBLIC, PublishStatus.PUBLISHED, pageable);
    }

    /**
     * The requesting principal's capabilities over this deck, from the same
     * predicates the {@code require*} guards use. The controller stamps the result
     * onto {@link DeckResponse} so the client can drive its affordances without
     * re-deriving the rules. Personal decks resolve without I/O; org-owned decks
     * cost one user lookup to read the requester's org role.
     */
    public ViewerPermissions permissionsFor(Deck deck, AmbiPrincipal principal) {
        String userId = userId(principal);
        UserLevel level = level(principal);
        OrgRole orgRole = orgRoleFor(deck, principal);
        return new ViewerPermissions(
                deck.canBeViewedBy(userId, level, orgRole),
                deck.canBeEditedBy(userId, level, orgRole),
                deck.canBeManagedBy(userId, level, orgRole));
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private Deck load(String id) {
        return deckRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("DECK_NOT_FOUND", "Deck not found"));
    }

    private void requireView(Deck deck, AmbiPrincipal principal) {
        if (!deck.canBeViewedBy(userId(principal), level(principal), orgRoleFor(deck, principal))) {
            throw new ForbiddenException("DECK_VIEW_FORBIDDEN",
                    "You do not have access to this deck");
        }
    }

    private void requireEdit(Deck deck, AmbiPrincipal principal) {
        if (!deck.canBeEditedBy(userId(principal), level(principal), orgRoleFor(deck, principal))) {
            throw new ForbiddenException("DECK_EDIT_FORBIDDEN",
                    "You do not have edit access to this deck");
        }
    }

    private void requireManage(Deck deck, AmbiPrincipal principal) {
        if (!deck.canBeManagedBy(userId(principal), level(principal), orgRoleFor(deck, principal))) {
            throw new ForbiddenException("DECK_MANAGE_FORBIDDEN",
                    "You do not have permission to manage this deck");
        }
    }

    /** Set publishedAt the first time a deck transitions into PUBLISHED. */
    private void applyPublishStatus(Deck deck, PublishStatus next) {
        if (next == PublishStatus.PUBLISHED && deck.getPublishedAt() == null) {
            deck.setPublishedAt(Instant.now());
        }
        deck.setPublishStatus(next);
    }

    /**
     * The requester's role in this deck's owning org, or null. Skips I/O for
     * personal decks.
     */
    private OrgRole orgRoleFor(Deck deck, AmbiPrincipal principal) {
        if (deck == null || !deck.isOrgOwned()) {
            return null;
        }
        return orgRoleFor(deck.getOrganizationId(), userId(principal));
    }

    private OrgRole orgRoleFor(String orgId, String userId) {
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

    private static String userId(AmbiPrincipal principal) {
        return principal == null ? null : principal.userId();
    }

    private static UserLevel level(AmbiPrincipal principal) {
        return principal == null ? null : principal.userLevel();
    }

    private static boolean isPlatformAdmin(AmbiPrincipal principal) {
        UserLevel level = level(principal);
        return level != null && level.hasAccessTo(UserLevel.ADMIN);
    }

    private static String requireUserId(AmbiPrincipal principal) {
        String id = userId(principal);
        if (id == null) {
            throw new UnauthorizedException("AUTH_REQUIRED", "Sign in to continue");
        }
        return id;
    }
}
