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
import com.cephadex.ambi.presentation.deck.dto.AnswerSettingsResponse;
import com.cephadex.ambi.presentation.deck.dto.DeckResponse;
import com.cephadex.ambi.presentation.deck.dto.MoveSlideRequest;
import com.cephadex.ambi.presentation.deck.dto.PointSettingsResponse;
import com.cephadex.ambi.presentation.deck.dto.SetAnswerSettingsRequest;
import com.cephadex.ambi.presentation.deck.dto.SetImageRequest;
import com.cephadex.ambi.presentation.deck.dto.SetPointSettingsRequest;
import com.cephadex.ambi.presentation.deck.dto.SetTagsRequest;
import com.cephadex.ambi.presentation.deck.dto.SetVisibilityRequest;
import com.cephadex.ambi.presentation.deck.dto.ShareDeckRequest;
import com.cephadex.ambi.presentation.deck.dto.SlideRequest;
import com.cephadex.ambi.presentation.deck.dto.SlideResponse;
import com.cephadex.ambi.presentation.deck.dto.UpdateDeckRequest;
import com.cephadex.ambi.presentation.slide.Slide;

import jakarta.validation.Valid;

/**
 * HTTP surface for the {@link Deck} aggregate. Every route delegates straight
 * to
 * {@link DeckService}, which owns the permission rules (see the package
 * README):
 * the controller only resolves the caller's {@link AmbiPrincipal}, maps DTOs,
 * and
 * lets the service throw the typed {@code ApiException}s the global handler
 * turns
 * into RFC 9457 problem responses. Decks are keyed by a high-entropy id, so a
 * forbidden access is an honest 403, never a masked 404.
 *
 * <p>
 * Slides are embedded in their deck but exposed as a sub-resource under
 * {@code /slides}: a deck read/list carries metadata only
 * ({@link DeckResponse}),
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
     * <p>
     * Idempotent, as PUT should be: a resend of the same id (retry, double
     * submit, refresh) hits the {@code _id} unique index — {@code create} always
     * inserts, never upserts — so we swallow the duplicate and return the
     * existing deck. The VIEW check still applies, so a caller who reuses an id
     * already owned by someone else gets the usual 403/404 rather than a peek.
     */
    @PutMapping("/{id}")
    public DeckResponse createDeck(
            @PathVariable String id,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        try {
            return toResponse(deckService.create(id, principal), principal);
        } catch (DuplicateKeyException alreadyExists) {
            return toResponse(deckService.getViewable(id, principal), principal);
        }
    }

    /** Read a deck's metadata (VIEW). */
    @GetMapping("/{id}")
    public DeckResponse getDeck(
            @PathVariable String id,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return toResponse(deckService.getViewable(id, principal), principal);
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
        return toResponse(deckService.update(id, body.toDeck(), principal), principal);
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
    public DeckResponse setDeckVisibility(
            @PathVariable String id,
            @Valid @RequestBody SetVisibilityRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return toResponse(deckService.setVisibility(id, body.visibility(), principal), principal);
    }

    /** Grant or update an explicit per-user share (MANAGE). Idempotent upsert. */
    @PutMapping("/{id}/shares/{userId}")
    public DeckResponse shareDeck(
            @PathVariable String id,
            @PathVariable String userId,
            @Valid @RequestBody ShareDeckRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return toResponse(deckService.share(id, userId, body.role(), principal), principal);
    }

    /** Revoke an explicit per-user share (MANAGE). */
    @DeleteMapping("/{id}/shares/{userId}")
    public DeckResponse revokeShareDeck(
            @PathVariable String id,
            @PathVariable String userId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return toResponse(deckService.revokeShare(id, userId, principal), principal);
    }

    // ── Deck images ─────────────────────────────────────────────────────────────
    // A dedicated home for cover/background images (EDIT), separate from the
    // metadata PATCH so an edit can't clobber an image. The future upload flow
    // (multipart / presigned URL) adds a POST alongside these PUTs.

    /** Set a deck's cover image (EDIT). */
    // TODO(upload): a multipart POST on this path will ingest bytes and populate the AppImage.
    @PutMapping("/{id}/cover-image")
    public DeckResponse setDeckCoverImage(
            @PathVariable String id,
            @Valid @RequestBody SetImageRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return toResponse(deckService.setDeckCoverImage(id, body.image(), principal), principal);
    }

    /** Clear a deck's cover image (EDIT). */
    @DeleteMapping("/{id}/cover-image")
    public DeckResponse clearDeckCoverImage(
            @PathVariable String id,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return toResponse(deckService.clearDeckCoverImage(id, principal), principal);
    }

    /** Set a deck's background image (EDIT). */
    // TODO(upload): a multipart POST on this path will ingest bytes and populate the AppImage.
    @PutMapping("/{id}/background-image")
    public DeckResponse setDeckBackgroundImage(
            @PathVariable String id,
            @Valid @RequestBody SetImageRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return toResponse(deckService.setDeckBackgroundImage(id, body.image(), principal), principal);
    }

    /** Clear a deck's background image (EDIT). */
    @DeleteMapping("/{id}/background-image")
    public DeckResponse clearDeckBackgroundImage(
            @PathVariable String id,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return toResponse(deckService.clearDeckBackgroundImage(id, principal), principal);
    }

    // ── Deck tags ───────────────────────────────────────────────────────────────
    // Tags get a dedicated home (EDIT), separate from the metadata PATCH so an
    // edit can't clobber them — the same single-owner split as deck images.

    /** Replace a deck's tag set (EDIT). The body fully replaces the current tags. */
    @PutMapping("/{id}/tags")
    public DeckResponse setDeckTags(
            @PathVariable String id,
            @Valid @RequestBody SetTagsRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return toResponse(deckService.setTags(id, body.tags(), principal), principal);
    }

    // ── Slides (sub-resource of a deck) ─────────────────────────────────────────

    /** A deck's slides, in storage order (VIEW). */
    @GetMapping("/{id}/slides")
    public List<SlideResponse> listDeckSlides(
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
        return toResponse(deckService.moveSlide(id, slideId, body.to(), principal), principal);
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

    // ── Slide images ────────────────────────────────────────────────────────────
    // Same set/clear split as deck images, scoped to an embedded slide (EDIT).

    /** Set a slide's cover image (EDIT). */
    // TODO(upload): a multipart POST on this path will ingest bytes and populate the AppImage.
    @PutMapping("/{id}/slides/{slideId}/cover-image")
    public SlideResponse setSlideCoverImage(
            @PathVariable String id,
            @PathVariable String slideId,
            @Valid @RequestBody SetImageRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return SlideResponse.from(deckService.setSlideCoverImage(id, slideId, body.image(), principal));
    }

    /** Clear a slide's cover image (EDIT). */
    @DeleteMapping("/{id}/slides/{slideId}/cover-image")
    public SlideResponse clearSlideCoverImage(
            @PathVariable String id,
            @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return SlideResponse.from(deckService.clearSlideCoverImage(id, slideId, principal));
    }

    /** Set a slide's background image (EDIT). */
    // TODO(upload): a multipart POST on this path will ingest bytes and populate the AppImage.
    @PutMapping("/{id}/slides/{slideId}/background-image")
    public SlideResponse setSlideBackgroundImage(
            @PathVariable String id,
            @PathVariable String slideId,
            @Valid @RequestBody SetImageRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return SlideResponse.from(deckService.setSlideBackgroundImage(id, slideId, body.image(), principal));
    }

    /** Clear a slide's background image (EDIT). */
    @DeleteMapping("/{id}/slides/{slideId}/background-image")
    public SlideResponse clearSlideBackgroundImage(
            @PathVariable String id,
            @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return SlideResponse.from(deckService.clearSlideBackgroundImage(id, slideId, principal));
    }

    // ── Slide point settings ─────────────────────────────────────────────────────
    // A slide's scoring override, in its own set/clear/read trio so it can be edited
    // without disturbing the slide's answer settings or any other field — the same
    // single-owner split the image endpoints use. PUT sets, DELETE falls the slide
    // back to the deck's point defaults, GET reads the current override (null = none).

    /** Read a slide's point (scoring) settings (VIEW). Null when the deck defaults apply. */
    @GetMapping("/{id}/slides/{slideId}/point-settings")
    public PointSettingsResponse getSlidePointSettings(
            @PathVariable String id,
            @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return PointSettingsResponse.from(deckService.getSlide(id, slideId, principal));
    }

    /** Set a slide's point (scoring) settings (EDIT). */
    @PutMapping("/{id}/slides/{slideId}/point-settings")
    public PointSettingsResponse setSlidePointSettings(
            @PathVariable String id,
            @PathVariable String slideId,
            @Valid @RequestBody SetPointSettingsRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return PointSettingsResponse.from(
                deckService.setSlidePointSettings(id, slideId, body.pointSettings(), principal));
    }

    /** Clear a slide's point (scoring) settings so the deck defaults apply (EDIT). */
    @DeleteMapping("/{id}/slides/{slideId}/point-settings")
    public PointSettingsResponse clearSlidePointSettings(
            @PathVariable String id,
            @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return PointSettingsResponse.from(deckService.clearSlidePointSettings(id, slideId, principal));
    }

    // ── Slide answer settings ────────────────────────────────────────────────────
    // The answering override, mirroring the point-settings trio: an independent
    // set/clear/read so editing one half never touches the other.

    /** Read a slide's answer (answering) settings (VIEW). Null when the deck defaults apply. */
    @GetMapping("/{id}/slides/{slideId}/answer-settings")
    public AnswerSettingsResponse getSlideAnswerSettings(
            @PathVariable String id,
            @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return AnswerSettingsResponse.from(deckService.getSlide(id, slideId, principal));
    }

    /** Set a slide's answer (answering) settings (EDIT). */
    @PutMapping("/{id}/slides/{slideId}/answer-settings")
    public AnswerSettingsResponse setSlideAnswerSettings(
            @PathVariable String id,
            @PathVariable String slideId,
            @Valid @RequestBody SetAnswerSettingsRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return AnswerSettingsResponse.from(
                deckService.setSlideAnswerSettings(id, slideId, body.answerSettings(), principal));
    }

    /** Clear a slide's answer (answering) settings so the deck defaults apply (EDIT). */
    @DeleteMapping("/{id}/slides/{slideId}/answer-settings")
    public AnswerSettingsResponse clearSlideAnswerSettings(
            @PathVariable String id,
            @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return AnswerSettingsResponse.from(deckService.clearSlideAnswerSettings(id, slideId, principal));
    }

    // ── Listings ────────────────────────────────────────────────────────────────

    /**
     * The caller's personal decks. Identity comes from the principal, never input.
     */
    @GetMapping("/mine")
    public List<DeckResponse> listMyDecks(@AuthenticationPrincipal AmbiPrincipal principal) {
        return deckService.listOwnedByUser(requireUserId(principal)).stream()
                .map(deck -> toResponse(deck, principal))
                .toList();
    }

    /** Decks owned by an org — requires the caller to be a member (VIEW). */
    @GetMapping(params = "orgId")
    public List<DeckResponse> listDecksForOrg(
            @RequestParam String orgId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return deckService.listForOrg(orgId, principal).stream()
                .map(deck -> toResponse(deck, principal))
                .toList();
    }

    /**
     * Publicly discoverable decks ({@code PUBLIC} + {@code PUBLISHED}). Open to
     * all.
     * Returned as a {@link PagedModel} — the stable, self-describing page envelope
     * ({@code content} + {@code page} metadata).
     */
    @GetMapping("/public")
    public PagedModel<DeckResponse> listPublicDecks(
            Pageable pageable,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return new PagedModel<>(
                deckService.listPublic(pageable).map(deck -> toResponse(deck, principal)));
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

    /** Map a deck to its response, stamped with the caller's computed permissions. */
    private DeckResponse toResponse(Deck deck, AmbiPrincipal principal) {
        return DeckResponse.from(deck, deckService.permissionsFor(deck, principal));
    }
}
