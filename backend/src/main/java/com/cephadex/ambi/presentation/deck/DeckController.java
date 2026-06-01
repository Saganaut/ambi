package com.cephadex.ambi.presentation.deck;

import java.util.List;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.UnauthorizedException;
import com.cephadex.ambi.presentation.deck.dto.DeckResponse;
import com.cephadex.ambi.presentation.deck.dto.MoveSlideRequest;
import com.cephadex.ambi.presentation.deck.dto.SetVisibilityRequest;
import com.cephadex.ambi.presentation.deck.dto.ShareDeckRequest;
import com.cephadex.ambi.presentation.deck.dto.SlideRequest;
import com.cephadex.ambi.presentation.deck.dto.SlideResponse;
import com.cephadex.ambi.presentation.deck.dto.UpdateDeckRequest;
import com.cephadex.ambi.presentation.slide.Slide;

import jakarta.validation.Valid;

/**
 * HTTP surface for the {@link Deck} aggregate. Every route delegates straight to
 * {@link DeckService}, which owns the permission rules (see the package README):
 * the controller only resolves the caller's {@link AmbiPrincipal}, maps DTOs, and
 * lets the service throw the typed {@code ApiException}s the global handler turns
 * into RFC 9457 problem responses. Decks are keyed by a high-entropy id, so a
 * forbidden access is an honest 403, never a masked 404.
 *
 * <p>Slides are embedded in their deck but exposed as a sub-resource under
 * {@code /slides}: a deck read/list carries metadata only ({@link DeckResponse}),
 * keeping payloads small and edits granular.
 */
@RestController
@RequestMapping("/api/decks")
public class DeckController {

    private final DeckService deckService;

    public DeckController(DeckService deckService) {
        this.deckService = deckService;
    }

    // ── Deck CRUD ─────────────────────────────────────────────────────────────

    /**
     * Optimistic create: the client mints the deck's UUID and PUTs it. The body
     * is empty — a fresh personal deck is created with the aggregate's field
     * defaults, owned by the caller. Subsequent metadata edits go through
     * {@link #updateDeck}.
     *
     * <p>Idempotent, as PUT should be: a resend of the same id (retry, double
     * submit, refresh) hits the {@code _id} unique index — {@code create} always
     * inserts, never upserts — so we swallow the duplicate and return the
     * existing deck. The VIEW check still applies, so a caller who reuses an id
     * already owned by someone else gets the usual 403/404 rather than a peek.
     */
    @PutMapping("/{id}")
    public DeckResponse create(
            @PathVariable String id,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        try {
            return DeckResponse.from(deckService.create(id, principal));
        } catch (DuplicateKeyException alreadyExists) {
            return DeckResponse.from(deckService.getViewable(id, principal));
        }
    }

    /** Read a deck's metadata (VIEW). */
    @GetMapping("/{id}")
    public DeckResponse getDeck(
            @PathVariable String id,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return DeckResponse.from(deckService.getViewable(id, principal));
    }

    /**
     * Replace a deck's editable metadata (EDIT). The body is the complete desired
     * metadata state; slides are untouched (they flow through the {@code /slides}
     * endpoints), so the deck's current slides are carried back through to the
     * service unchanged.
     */
    @PatchMapping("/{id}")
    public DeckResponse updateDeck(
            @PathVariable String id,
            @Valid @RequestBody UpdateDeckRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        Deck existing = deckService.getEditable(id, principal);
        Deck changes = body.toDeckChanges(existing.getSlides());
        return DeckResponse.from(deckService.update(id, changes, principal));
    }

    /** Delete a deck and its embedded slides (MANAGE). */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDeck(
            @PathVariable String id,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        deckService.delete(id, principal);
    }

    // ── Management ────────────────────────────────────────────────────────────

    /** Change a deck's visibility (MANAGE). */
    @PutMapping("/{id}/visibility")
    public DeckResponse setVisibility(
            @PathVariable String id,
            @Valid @RequestBody SetVisibilityRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return DeckResponse.from(deckService.setVisibility(id, body.visibility(), principal));
    }

    /** Grant or update an explicit per-user share (MANAGE). Idempotent upsert. */
    @PutMapping("/{id}/shares/{userId}")
    public DeckResponse share(
            @PathVariable String id,
            @PathVariable String userId,
            @Valid @RequestBody ShareDeckRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return DeckResponse.from(deckService.share(id, userId, body.role(), principal));
    }

    /** Revoke an explicit per-user share (MANAGE). */
    @DeleteMapping("/{id}/shares/{userId}")
    public DeckResponse revokeShare(
            @PathVariable String id,
            @PathVariable String userId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return DeckResponse.from(deckService.revokeShare(id, userId, principal));
    }

    // ── Slides (sub-resource of a deck) ─────────────────────────────────────────

    /** A deck's slides, in storage order (VIEW). */
    @GetMapping("/{id}/slides")
    public List<SlideResponse> listSlides(
            @PathVariable String id,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return deckService.listSlides(id, principal).stream()
                .map(SlideResponse::from)
                .toList();
    }

    /** A single slide of a deck (VIEW). */
    @GetMapping("/{id}/slides/{slideId}")
    public SlideResponse getSlide(
            @PathVariable String id,
            @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return SlideResponse.from(deckService.getSlide(id, slideId, principal));
    }

    /** Append a slide to a deck (EDIT). The client may mint the slide id. */
    @PostMapping("/{id}/slides")
    @ResponseStatus(HttpStatus.CREATED)
    public SlideResponse addSlide(
            @PathVariable String id,
            @Valid @RequestBody SlideRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        Slide added = deckService.addSlide(id, body.toSlide(), principal);
        return SlideResponse.from(added);
    }

    /** Replace a slide's editable presentation fields (EDIT). */
    @PutMapping("/{id}/slides/{slideId}")
    public SlideResponse updateSlide(
            @PathVariable String id,
            @PathVariable String slideId,
            @Valid @RequestBody SlideRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        Slide updated = deckService.updateSlide(id, slideId, body.toSlide(), principal);
        return SlideResponse.from(updated);
    }

    /**
     * Move a slide to a new position in the deck's order (EDIT). The body carries
     * the target index; the backend rewrites only that slide's {@code sortOrder}.
     * Returns the canonical {@link DeckResponse} (metadata only) like every other
     * deck mutation, so the client can sync its deck cache; the reordered slides
     * are read back via {@code GET /slides}.
     */
    @PatchMapping("/{id}/slides/{slideId}/move")
    public DeckResponse moveSlide(
            @PathVariable String id,
            @PathVariable String slideId,
            @Valid @RequestBody MoveSlideRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return DeckResponse.from(deckService.moveSlide(id, slideId, body.to(), principal));
    }

    /** Remove a slide from a deck (EDIT). */
    @DeleteMapping("/{id}/slides/{slideId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeSlide(
            @PathVariable String id,
            @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        deckService.removeSlide(id, slideId, principal);
    }

    // ── Listings ────────────────────────────────────────────────────────────────

    /** The caller's personal decks. Identity comes from the principal, never input. */
    @GetMapping("/mine")
    public List<DeckResponse> listMine(@AuthenticationPrincipal AmbiPrincipal principal) {
        return deckService.listOwnedByUser(requireUserId(principal)).stream()
                .map(DeckResponse::from)
                .toList();
    }

    /** Decks owned by an org — requires the caller to be a member (VIEW). */
    @GetMapping(params = "orgId")
    public List<DeckResponse> listForOrg(
            @RequestParam String orgId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return deckService.listForOrg(orgId, principal).stream()
                .map(DeckResponse::from)
                .toList();
    }

    /**
     * Publicly discoverable decks ({@code PUBLIC} + {@code PUBLISHED}). Open to all.
     * Returned as a {@link PagedModel} — the stable, self-describing page envelope
     * ({@code content} + {@code page} metadata).
     */
    @GetMapping("/public")
    public PagedModel<DeckResponse> listPublic(Pageable pageable) {
        return new PagedModel<>(deckService.listPublic(pageable).map(DeckResponse::from));
    }

    /**
     * Defence-in-depth: the filter chain already guarantees a registered principal
     * on {@code /mine}, but a backed principal always carries a {@code userId}, so
     * a null is a contract violation rather than an expected anonymous case.
     */
    private String requireUserId(AmbiPrincipal principal) {
        if (principal == null || principal.userId() == null) {
            throw new UnauthorizedException("NOT_AUTHENTICATED", "Sign-in is required.");
        }
        return principal.userId();
    }
}
