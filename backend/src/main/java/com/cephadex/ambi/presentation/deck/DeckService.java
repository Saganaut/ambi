package com.cephadex.ambi.presentation.deck;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.common.exception.UnauthorizedException;
import com.cephadex.ambi.org.OrgMembership;
import com.cephadex.ambi.org.enums.OrgRole;
import com.cephadex.ambi.presentation.deck.enums.DeckAclRole;
import com.cephadex.ambi.presentation.deck.enums.DeckVisibility;
import com.cephadex.ambi.presentation.deck.enums.OwnershipType;
import com.cephadex.ambi.presentation.deck.enums.PublishStatus;
import com.cephadex.ambi.presentation.slide.Slide;
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

    public DeckService(DeckRepository deckRepository, UserService userService) {
        this.deckRepository = deckRepository;
        this.userService = userService;
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
     * Ownership, visibility, ACL and identifiers are intentionally untouched —
     * those flow through the MANAGE-gated methods below.
     */
    public Deck update(String id, Deck changes, AmbiPrincipal principal) {
        Deck deck = getEditable(id, principal);

        deck.setName(changes.getName());
        deck.setDescription(changes.getDescription());
        deck.setCoverImage(changes.getCoverImage());
        deck.setBackgroundImage(changes.getBackgroundImage());
        deck.setThemeId(changes.getThemeId());
        deck.setLanguage(changes.getLanguage());
        deck.setSettings(changes.getSettings());
        deck.setTags(changes.getTags());
        deck.setSlides(changes.getSlides());
        applyPublishStatus(deck, changes.getPublishStatus());

        return deckRepository.save(deck);
    }

    // ── Slides ────────────────────────────────────────────────────────────────
    // Slides are embedded in the deck, so a slide operation IS a deck operation:
    // gate on the deck's VIEW/EDIT, mutate the embedded list, save the deck.

    /** A deck's slides (VIEW). */
    public List<Slide> listSlides(String deckId, AmbiPrincipal principal) {
        return getViewable(deckId, principal).getSlides();
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
        deck.addSlide(slide);
        deckRepository.save(deck);
        return slide;
    }

    /** Replace a slide's editable presentation fields (EDIT). */
    public Slide updateSlide(String deckId, String slideId, Slide changes, AmbiPrincipal principal) {
        Deck deck = getEditable(deckId, principal);
        Slide slide = deck.findSlide(slideId)
                .orElseThrow(() -> new NotFoundException("SLIDE_NOT_FOUND", "Slide not found"));

        slide.setTitle(changes.getTitle());
        slide.setStyledTitle(changes.getStyledTitle());
        slide.setSection(changes.getSection());
        slide.setSlideType(changes.getSlideType());
        slide.setBackgroundImage(changes.getBackgroundImage());
        slide.setCoverImage(changes.getCoverImage());
        slide.setParentId(changes.getParentId());
        slide.setChildId(changes.getChildId());
        slide.setSortOrder(changes.getSortOrder());
        slide.setLastEditedByUserId(principal.userId());

        deckRepository.save(deck);
        return slide;
    }

    /** Remove a slide from a deck (EDIT). */
    public void removeSlide(String deckId, String slideId, AmbiPrincipal principal) {
        Deck deck = getEditable(deckId, principal);
        if (!deck.removeSlide(slideId)) {
            throw new NotFoundException("SLIDE_NOT_FOUND", "Slide not found");
        }
        deckRepository.save(deck);
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
