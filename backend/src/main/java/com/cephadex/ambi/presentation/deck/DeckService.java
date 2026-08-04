package com.cephadex.ambi.presentation.deck;

import static com.cephadex.ambi.auth.security.AmbiPrincipals.isPlatformAdmin;
import static com.cephadex.ambi.auth.security.AmbiPrincipals.level;
import static com.cephadex.ambi.auth.security.AmbiPrincipals.requireUserId;
import static com.cephadex.ambi.auth.security.AmbiPrincipals.userId;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.function.UnaryOperator;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.Ownership;
import com.cephadex.ambi.common.ViewerPermissions;
import com.cephadex.ambi.common.enums.OwnershipType;
import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.storage.ImageIngestService;
import com.cephadex.ambi.media.storage.ImageKeys;
import com.cephadex.ambi.org.OrgRoleResolver;
import com.cephadex.ambi.org.enums.OrgRole;
import com.cephadex.ambi.presentation.deck.config.DeckDefaultsProperties;
import com.cephadex.ambi.presentation.deck.dto.DeckResponse;
import com.cephadex.ambi.presentation.deck.enums.DeckAclRole;
import com.cephadex.ambi.presentation.deck.enums.DeckVisibility;
import com.cephadex.ambi.presentation.deck.enums.PublishStatus;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.SlideRankService;
import com.cephadex.ambi.presentation.slide.content.DrawingContent;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.presentation.slide.content.RichTextSanitizer;
import com.cephadex.ambi.presentation.slide.content.ScorableContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.presentation.slide.enums.SlideType;
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
    private final OrgRoleResolver orgRoles;
    private final SlideRankService rankService;
    private final DeckDefaultsProperties deckDefaults;
    private final RichTextSanitizer richTextSanitizer;
    private final ImageIngestService imageIngest;

    public DeckService(DeckRepository deckRepository, OrgRoleResolver orgRoles,
            SlideRankService rankService, DeckDefaultsProperties deckDefaults,
            RichTextSanitizer richTextSanitizer, ImageIngestService imageIngest) {
        this.deckRepository = deckRepository;
        this.orgRoles = orgRoles;
        this.rankService = rankService;
        this.deckDefaults = deckDefaults;
        this.richTextSanitizer = richTextSanitizer;
        this.imageIngest = imageIngest;
    }

    // ── Create ──────────────────────────────────────────────────────────────

    /**
     * Optimistic creation: the client mints the deck's UUID and we persist a
     * fresh personal deck owned by the caller. Tunable defaults (name, language,
     * full {@code DeckSettings}) come from {@link DeckDefaultsProperties}; the
     * safety-invariant {@code PRIVATE} visibility / {@code DRAFT} status are the
     * aggregate's own field defaults.
     */
    public Deck create(String id, AmbiPrincipal principal) {
        String userId = requireUserId(principal);

        Deck deck = new Deck();
        deck.setId(id);
        deck.setName(deckDefaults.getName());
        deck.setLanguage(deckDefaults.getLanguage());
        deck.setSettings(deckDefaults.deckSettings());
        deck.setOwnership(new Ownership(OwnershipType.USER, userId));
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
     * metadata edit. Tags are likewise untouched; they have a single owner in
     * {@link #setTags}. Ownership, visibility, ACL and identifiers are also
     * untouched; those flow through the MANAGE-gated methods.
     */
    public Deck update(String id, Deck changes, AmbiPrincipal principal) {
        Deck deck = getEditable(id, principal);

        deck.setName(changes.getName());
        deck.setLabel(changes.getLabel());
        deck.setDescription(changes.getDescription());
        deck.setThemeId(changes.getThemeId());
        deck.setLanguage(changes.getLanguage());
        // Settings are NOT edited here: each embedded settings sub-document
        // (point/answer/audience) has a single owner in its own dedicated
        // endpoint, persisted via a targeted update that never re-versions the
        // deck. Routing them through this whole-deck PATCH would re-introduce the
        // version contention those endpoints exist to avoid.
        applyPublishStatus(deck, changes.getPublishStatus());

        return deckRepository.save(deck);
    }

    /**
     * Replace a deck's tag set (EDIT capability). Like the image methods, tags
     * have a single owner here so a metadata edit can never clobber them; the
     * submitted set fully replaces the current tags.
     */
    public Deck setTags(String id, Set<String> tags, AmbiPrincipal principal) {
        Deck deck = getEditable(id, principal);
        deck.setTags(new LinkedHashSet<>(tags));
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
        // Defense-in-depth at the storage boundary: allowlist-sanitize any
        // editor-authored HTML before it is persisted, so the stored body is
        // safe regardless of ingestion route (see RichTextSanitizer).
        slide.setContent(richTextSanitizer.sanitize(slide.getContent()));
        // Ordering is server-owned: key any legacy slides, then append past the
        // current last. Any client-supplied sortOrder is ignored on purpose.
        deck.backfillRanks(rankService);
        slide.setSortOrder(rankService.after(deck.maxSortOrder()));
        deck.addSlide(slide);
        deck.resort();
        deckRepository.save(deck);
        return slide;
    }

    /**
     * Add a follow-up slide chained directly after a scorable parent (EDIT).
     * The link ({@code parentId}/{@code childId}) and the placement are entirely
     * server-owned; the client supplies only the new slide's optimistic id, the
     * {@link FollowUpMode}, and an optional title. Returns the deck's slides in
     * canonical order — the operation touches two slides and inserts mid-list,
     * so the caller reconciles its cache from the response like a move.
     */
    public List<Slide> addFollowUpSlide(String deckId, String parentSlideId, String followUpId,
            FollowUpMode mode, String title, AmbiPrincipal principal) {
        Deck deck = getEditable(deckId, principal);
        Slide parent = deck.findSlide(parentSlideId)
                .orElseThrow(() -> new NotFoundException("SLIDE_NOT_FOUND", "Slide not found"));

        if (deck.isAttachedFollowUp(parent)) {
            throw new ValidationException("A follow-up slide cannot have its own follow-up");
        }
        SlideContent parentContent = parent.getContent();
        if (!(parentContent instanceof ScorableContent)
                || parentContent.contentType() == SlideType.FOLLOW_UP) {
            throw new ValidationException("Only scorable slides can have a follow-up");
        }
        if (!mode.supportsParent(parentContent.contentType())) {
            throw new ValidationException("Follow-up mode " + mode + " is not valid for a "
                    + parentContent.contentType() + " slide");
        }
        requireAnswerKeyFor(mode, parentContent);
        if (deck.attachedFollowUp(parent).isPresent()) {
            throw new ConflictException("FOLLOW_UP_EXISTS", "Slide already has a follow-up");
        }
        // A childId that survived the attachment check is dangling legacy data
        // (missing target, mismatched back-pointer, or non-follow-up content) —
        // self-heal by unlinking both ends before attaching the real follow-up.
        if (parent.getChildId() != null) {
            deck.findSlide(parent.getChildId()).ifPresent(stale -> {
                if (parentSlideId.equals(stale.getParentId())) {
                    stale.setParentId(null);
                }
            });
            parent.setChildId(null);
        }

        String userId = principal.userId();
        Slide followUp = new Slide();
        followUp.setId(followUpId != null ? followUpId : UUID.randomUUID().toString());
        followUp.setTitle(title != null ? title : "");
        followUp.setContent(new FollowUpContent(mode));
        followUp.setCreatedByUserId(userId);
        followUp.setLastEditedByUserId(userId);

        deck.backfillRanks(rankService);
        deck.addFollowUp(followUp, parent, rankService);
        deckRepository.save(deck);
        return deck.getSlides().stream()
                .sorted(SlideRankService.ordering())
                .toList();
    }

    /** Replace a slide's editable presentation fields (EDIT). */
    public Slide updateSlide(String deckId, String slideId, Slide changes, AmbiPrincipal principal) {
        Deck deck = getEditable(deckId, principal);
        Slide slide = deck.findSlide(slideId)
                .orElseThrow(() -> new NotFoundException("SLIDE_NOT_FOUND", "Slide not found"));

        requireValidContentTransition(deck, slide, changes.getContent());

        slide.setTitle(changes.getTitle());
        slide.setSection(changes.getSection());
        // parentId/childId are server-owned: minted only by addFollowUpSlide and
        // cleared on delete — an update can never rewrite the link.
        // sortOrder is server-owned and unchanged here — reordering goes through
        // moveSlide, so an update never lets the client jump a slide's position.
        // Sanitize editor-authored HTML at the storage boundary (see addSlide).
        slide.setContent(richTextSanitizer.sanitize(changes.getContent()));
        slide.setLastEditedByUserId(principal.userId());

        deck.backfillRanks(rankService);
        deck.resort();
        deckRepository.save(deck);
        return slide;
    }

    /**
     * The follow-up guards on a content update. A follow-up keeps its kind (and
     * a mode its parent's type supports, with an answer key when the mode needs
     * one); a regular slide can't become one (the dedicated endpoint is the only
     * mint); a parent can't change to a content type — or, for an answer-key
     * mode, to content — its attached follow-up's mode doesn't support. The mode
     * change is the inspector's everyday path, so it enforces exactly what
     * {@link #addFollowUpSlide} does; the type changes have no UI today and are
     * defenses against API misuse.
     */
    private static void requireValidContentTransition(Deck deck, Slide slide, SlideContent next) {
        boolean isFollowUp = slide.getContent() instanceof FollowUpContent;
        if (!isFollowUp && next instanceof FollowUpContent) {
            throw new ValidationException(
                    "A follow-up slide can only be created through the follow-up endpoint");
        }
        if (isFollowUp) {
            if (!(next instanceof FollowUpContent nextFollowUp)) {
                throw new ValidationException(
                        "A follow-up slide cannot change to another slide type; delete it instead");
            }
            deck.findSlide(slide.getParentId()).ifPresent(parent -> {
                if (!nextFollowUp.mode().supportsParent(parent.getContent().contentType())) {
                    throw new ValidationException("Follow-up mode " + nextFollowUp.mode()
                            + " is not valid for a " + parent.getContent().contentType() + " slide");
                }
                requireAnswerKeyFor(nextFollowUp.mode(), parent.getContent());
            });
        }
        deck.attachedFollowUp(slide).ifPresent(child -> {
            FollowUpMode childMode = ((FollowUpContent) child.getContent()).mode();
            if (next != null && !childMode.supportsParent(next.contentType())) {
                throw new ValidationException(
                        "Changing this slide's type would invalidate its follow-up; delete the follow-up first");
            }
            if (next != null && childMode.requiresAnswerKey() && !hasAnswerKey(next)) {
                throw new ValidationException(
                        "Removing this slide's authored answer would invalidate its follow-up, which hides "
                                + "that answer among the submissions; change the follow-up's mode first");
            }
        });
    }

    /**
     * Rejects a follow-up mode that hides the parent's authored answer among the
     * submissions ({@link FollowUpMode#requiresAnswerKey}) when the parent has no
     * such answer to hide. {@code supportsParent} only settles the parent's
     * <em>type</em>, and an unkeyed TEXT slide (or a Drawing slide with no
     * authored correct image) is a legitimate collect-only prompt, so this is
     * the second half of the pairing rule — enforced wherever the pairing can
     * change (the add endpoint, and the inspector's mode edit).
     */
    private static void requireAnswerKeyFor(FollowUpMode mode, SlideContent parentContent) {
        if (mode.requiresAnswerKey() && !hasAnswerKey(parentContent)) {
            throw new ValidationException("Follow-up mode " + mode
                    + " needs a parent slide with an authored answer; add one first");
        }
    }

    /**
     * Whether {@code content} carries an authored answer a follow-up could hide
     * among the parent round's submissions — the content-level half of the
     * pairing rule, resolved per parent kind:
     *
     * <ul>
     * <li><strong>TEXT</strong> — at least one non-blank accepted answer;</li>
     * <li><strong>DRAWING</strong> — a {@code correctImage} that is stored (not
     * an external URL, which owns no object the board could serve opaquely
     * alongside the submitted drawings) and holds at least one renderable
     * variant.</li>
     * </ul>
     *
     * <p>The DRAWING arm is exactly the negation of the frontend's
     * {@code isImageEmpty} (plus the external exclusion), so the mode the editor
     * offers and the mode the API accepts agree by construction rather than by
     * two independently-maintained rules. Every other kind has no authored
     * answer a board could show, so it can never take a keyed mode — which
     * {@code supportsParent} already settles first.
     */
    private static boolean hasAnswerKey(SlideContent content) {
        return switch (content) {
            case TextContent text -> text.acceptedAnswers() != null
                    && text.acceptedAnswers().stream().anyMatch(answer -> answer != null && !answer.isBlank());
            case DrawingContent drawing -> isSeedableImage(drawing.correctImage());
            case null, default -> false;
        };
    }

    /** Whether an image is stored and carries a variant a board could render. */
    private static boolean isSeedableImage(AppImage image) {
        return image != null
                && !image.isExternal()
                && image.getVariants() != null
                && image.getVariants().values().stream().anyMatch(url -> url != null && !url.isBlank());
    }

    /**
     * Move a slide to {@code toIndex} in the deck's order (EDIT). The slide
     * moves as a unit with its attached follow-up, if any; only the moved unit's
     * {@code sortOrder} keys are rewritten, and a destination inside another
     * parent/follow-up pair snaps past it. Moving a follow-up itself is
     * rejected — it only moves with its parent. Returns the deck's slides in
     * their new canonical order so the caller can patch its slide cache from the
     * response — no reconciling re-fetch of {@code GET /slides} needed.
     */
    public List<Slide> moveSlide(String deckId, String slideId, int toIndex, AmbiPrincipal principal) {
        Deck deck = getEditable(deckId, principal);
        Slide slide = deck.findSlide(slideId)
                .orElseThrow(() -> new NotFoundException("SLIDE_NOT_FOUND", "Slide not found"));

        if (deck.isAttachedFollowUp(slide)) {
            throw new ValidationException(
                    "A follow-up slide moves with its parent and cannot be moved directly");
        }

        deck.backfillRanks(rankService);
        deck.reorderUnit(slideId, toIndex, rankService);
        slide.setLastEditedByUserId(principal.userId());

        deckRepository.save(deck);
        return deck.getSlides().stream()
                .sorted(SlideRankService.ordering())
                .toList();
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
    // explicit operation — while a metadata/slide edit can never clobber them.
    // These take a pre-resolved AppImage: bytes are ingested via the gallery
    // upload route first, then the resulting AppImage is set here. PUT sets, the
    // clear* methods null the slot. Slides are embedded, so a slide image change
    // saves the whole deck, exactly like updateSlide.

    /**
     * Ingest raw image bytes straight into this deck's own key namespace (EDIT)
     * and hand back the bare {@link AppImage}. This is the placement-only
     * ingest: <strong>no {@code GalleryImage} is created and no gallery is
     * touched</strong> — the bytes are one slot's content, not a library item.
     *
     * @throws NotFoundException   if the deck doesn't exist
     * @throws ForbiddenException  if the caller may not edit the deck
     * @throws ValidationException if the upload is empty, oversized, or not an
     *                             allowed image type
     */
    public AppImage uploadImage(String deckId, byte[] bytes, String contentType,
            String originalFilename, AmbiPrincipal principal) {
        getEditable(deckId, principal);
        return imageIngest.ingest(bytes, contentType, originalFilename,
                ImageKeys.newDeckImagePrefix(deckId));
    }

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
        return applySlideMutation(deckId, slideId, principal, slide -> slide.setCoverImage(image));
    }

    /** Clear a slide's cover image (EDIT). */
    public Slide clearSlideCoverImage(String deckId, String slideId, AmbiPrincipal principal) {
        return applySlideMutation(deckId, slideId, principal, slide -> slide.setCoverImage(null));
    }

    /**
     * Set a slide's background image (EDIT). An explicit image always wins over the
     * deck default, so the {@code hideBackground} suppress flag is cleared too — the
     * two can never be meaningfully set at once.
     */
    public Slide setSlideBackgroundImage(String deckId, String slideId, AppImage image, AmbiPrincipal principal) {
        return applySlideMutation(deckId, slideId, principal, slide -> {
            slide.setBackgroundImage(image);
            slide.setHideBackground(false);
        });
    }

    /**
     * Clear a slide's background image so it falls back to the deck default (EDIT).
     * This is the "reset to deck" action: it drops the slide's own image <em>and</em>
     * the suppress flag, leaving the slide to inherit. To instead remove the
     * background entirely (ignoring the deck default), see {@link #hideSlideBackground}.
     */
    public Slide clearSlideBackgroundImage(String deckId, String slideId, AmbiPrincipal principal) {
        return applySlideMutation(deckId, slideId, principal, slide -> {
            slide.setBackgroundImage(null);
            slide.setHideBackground(false);
        });
    }

    /**
     * Remove a slide's background entirely (EDIT): no image of its own <em>and</em>
     * the deck default suppressed, so the slide renders with no background even when
     * the deck has one. This is the third background state, distinct from
     * {@link #clearSlideBackgroundImage} ("reset to deck"): it sets the suppress flag
     * rather than clearing it.
     */
    public Slide hideSlideBackground(String deckId, String slideId, AmbiPrincipal principal) {
        return applySlideMutation(deckId, slideId, principal, slide -> {
            slide.setBackgroundImage(null);
            slide.setHideBackground(true);
        });
    }

    /**
     * Promote a background image to the deck default and clear every slide's own
     * background override in a single atomic update (EDIT). Unlike the plain
     * {@link #setDeckBackgroundImage} which only updates the deck, this also drops
     * all per-slide overrides — both the image and the {@code hideBackground}
     * suppress flag — so every slide falls through to the new deck image. A null
     * {@code image} clears the deck default instead (see
     * {@link #promoteClearedBackgroundImageToDeck}).
     */
    public Deck promoteBackgroundImageToDeck(String id, AppImage image, AmbiPrincipal principal) {
        Deck deck = getEditable(id, principal);
        deck.setBackgroundImage(image);
        deck.getSlides().forEach(s -> {
            s.setBackgroundImage(null);
            s.setHideBackground(false);
        });
        deckRepository.promoteBackgroundImageToDeck(id, image);
        return deck;
    }

    /**
     * Promote a cleared background image to the deck default (EDIT): the deck's
     * default background image goes to null and every slide's own override —
     * both the image and the {@code hideBackground} suppress flag — is dropped
     * in the same single atomic update, so all slides uniformly show no
     * background image. The clearing counterpart of
     * {@link #promoteBackgroundImageToDeck}, and unlike the plain
     * {@link #clearDeckBackgroundImage} which only touches the deck.
     */
    public Deck promoteClearedBackgroundImageToDeck(String id, AmbiPrincipal principal) {
        return promoteBackgroundImageToDeck(id, null, principal);
    }

    private Deck applyDeckImage(String id, AmbiPrincipal principal, Consumer<Deck> mutation) {
        Deck deck = getEditable(id, principal);
        mutation.accept(deck);
        return deckRepository.save(deck);
    }

    // ── Background color ──────────────────────────────────────────────────────
    // The color counterpart to the background image, with the same set/clear
    // split and "apply to deck" promote. A color composes BEHIND the image (it
    // paints the base layer), so unlike the image these operations are wholly
    // independent of the shared hideBackground flag: an own color always wins its
    // layer, and clearing one just falls back to deck inheritance. hideBackground
    // still governs whether an inherited color (and image) is suppressed — it is
    // left untouched by every color operation, including promote.

    /** Set a deck's default background color (EDIT). */
    public Deck setDeckBackgroundColor(String id, String color, AmbiPrincipal principal) {
        return applyDeckImage(id, principal, deck -> deck.setBackgroundColor(color));
    }

    /** Clear a deck's default background color (EDIT). */
    public Deck clearDeckBackgroundColor(String id, AmbiPrincipal principal) {
        return applyDeckImage(id, principal, deck -> deck.setBackgroundColor(null));
    }

    /** Set a slide's background-color override (EDIT). */
    public Slide setSlideBackgroundColor(String deckId, String slideId, String color, AmbiPrincipal principal) {
        return applySlideMutation(deckId, slideId, principal, slide -> slide.setBackgroundColor(color));
    }

    /** Clear a slide's background-color override so it inherits the deck default (EDIT). */
    public Slide clearSlideBackgroundColor(String deckId, String slideId, AmbiPrincipal principal) {
        return applySlideMutation(deckId, slideId, principal, slide -> slide.setBackgroundColor(null));
    }

    /**
     * Promote a background color to the deck default and clear every slide's own
     * background-color override in a single atomic update (EDIT). Unlike the plain
     * {@link #setDeckBackgroundColor} which only updates the deck, this also drops
     * all per-slide color overrides so every slide falls through to the new deck
     * color. The shared {@code hideBackground} flag is deliberately left untouched
     * — promoting a color must not un-suppress a slide that opted out of the
     * inherited background. A null {@code color} clears the deck default instead
     * (see {@link #promoteClearedBackgroundColorToDeck}).
     */
    public Deck promoteBackgroundColorToDeck(String id, String color, AmbiPrincipal principal) {
        Deck deck = getEditable(id, principal);
        deck.setBackgroundColor(color);
        deck.getSlides().forEach(s -> s.setBackgroundColor(null));
        deckRepository.promoteBackgroundColorToDeck(id, color);
        return deck;
    }

    /**
     * Promote a cleared background color to the deck default (EDIT): the deck's
     * default background color goes to null and every slide's own color override
     * is dropped in the same single atomic update, so no slide paints a color
     * layer anymore. The clearing counterpart of
     * {@link #promoteBackgroundColorToDeck}, and unlike the plain
     * {@link #clearDeckBackgroundColor} which only touches the deck. As there,
     * the shared {@code hideBackground} flag is deliberately left untouched —
     * clearing the color must not un-suppress a slide that opted out of the
     * inherited background.
     */
    public Deck promoteClearedBackgroundColorToDeck(String id, AmbiPrincipal principal) {
        return promoteBackgroundColorToDeck(id, null, principal);
    }

    // ── Slide settings ──────────────────────────────────────────────────────────
    // A slide carries two independent overrides — point (scoring) and answer
    // (answering) settings — wrapped in an immutable SlideSettings. Each half has
    // its own set/clear pair so an edit to one never disturbs the other; clearing a
    // half lets the deck defaults apply at session time. When both halves are absent
    // the wrapper itself is dropped to null. The two halves never flow through
    // updateSlide.
    //
    // Unlike images, settings persist through a TARGETED positional update
    // (applySlideSettings → deckRepository.updateSlideSettings) that rewrites only
    // this slide's `settings` sub-document and leaves the deck's @Version alone, so
    // a settings tweak no longer re-versions the whole deck or contends with
    // deck-level writes on that single version counter.
    //
    // TODO: extend this targeted-update treatment to the other slide-scoped writes
    //   — the image setters (applySlideMutation) and updateSlide — which still
    //   save(deck) and bump @Version. Trade-off to keep in mind: a targeted update
    //   is not version-guarded against a concurrent whole-deck save, so it's
    //   last-writer-wins on the touched field (no 500, but no merge either). If we
    //   later want real per-slide concurrency control, the dead Slide.version
    //   (Integer, never @Version) is the natural hook to start enforcing.

    /** Set a slide's point (scoring) settings, preserving its answer settings (EDIT). */
    public Slide setSlidePointSettings(String deckId, String slideId,
            Settings.PointSettings pointSettings, AmbiPrincipal principal) {
        return applySlideSettings(deckId, slideId, principal,
                current -> withPointSettings(current, pointSettings));
    }

    /** Clear a slide's point (scoring) settings, preserving its answer settings (EDIT). */
    public Slide clearSlidePointSettings(String deckId, String slideId, AmbiPrincipal principal) {
        return applySlideSettings(deckId, slideId, principal,
                current -> withPointSettings(current, null));
    }

    /** Set a slide's answer (answering) settings, preserving its point settings (EDIT). */
    public Slide setSlideAnswerSettings(String deckId, String slideId,
            Settings.AnswerSettings answerSettings, AmbiPrincipal principal) {
        return applySlideSettings(deckId, slideId, principal,
                current -> withAnswerSettings(current, answerSettings));
    }

    /** Clear a slide's answer (answering) settings, preserving its point settings (EDIT). */
    public Slide clearSlideAnswerSettings(String deckId, String slideId, AmbiPrincipal principal) {
        return applySlideSettings(deckId, slideId, principal,
                current -> withAnswerSettings(current, null));
    }

    /**
     * Authorize + load the deck, recompute the slide's settings wrapper, then
     * persist just that sub-document via a positional update (no deck @Version
     * bump). The slide is mutated in memory too so the returned object — and thus
     * the {@code *SettingsResponse} built from it — reflects the change.
     */
    private Slide applySlideSettings(String deckId, String slideId, AmbiPrincipal principal,
            UnaryOperator<Settings.SlideSettings> settingsUpdate) {
        Deck deck = getEditable(deckId, principal);
        Slide slide = deck.findSlide(slideId)
                .orElseThrow(() -> new NotFoundException("SLIDE_NOT_FOUND", "Slide not found"));
        Settings.SlideSettings next = settingsUpdate.apply(slide.getSettings());
        slide.setSettings(next);
        slide.setLastEditedByUserId(principal.userId());
        deckRepository.updateSlideSettings(deckId, slideId, next, principal.userId());
        return slide;
    }

    /** Replace the point half of a slide's settings, keeping the existing answer half. */
    private static Settings.SlideSettings withPointSettings(
            Settings.SlideSettings current, Settings.PointSettings points) {
        Settings.AnswerSettings answers = current == null ? null : current.answerSettings();
        return slideSettings(points, answers);
    }

    /** Replace the answer half of a slide's settings, keeping the existing point half. */
    private static Settings.SlideSettings withAnswerSettings(
            Settings.SlideSettings current, Settings.AnswerSettings answers) {
        Settings.PointSettings points = current == null ? null : current.pointSettings();
        return slideSettings(points, answers);
    }

    /** Collapse an all-absent override back to null so the deck defaults apply cleanly. */
    private static Settings.SlideSettings slideSettings(
            Settings.PointSettings points, Settings.AnswerSettings answers) {
        if (points == null && answers == null) {
            return null;
        }
        return new Settings.SlideSettings(points, answers);
    }

    // ── Deck settings ───────────────────────────────────────────────────────────
    // The deck's own default point / answer / audience settings. Each embedded
    // sub-document has a single owner in its dedicated endpoint and persists
    // through a TARGETED sub-path update (deckRepository.updateDeck*Settings) that
    // rewrites only that sub-document and leaves the deck's @Version alone — so two
    // deck-settings edits (e.g. toggling several pacing switches, or an "apply to
    // deck") can't contend on the version. The deck is loaded for the EDIT check
    // and to build the response, mutated in memory, then persisted targeted.

    /** Replace the deck's default point (scoring) settings (EDIT). */
    public Deck setDeckPointSettings(String id, Settings.PointSettings pointSettings, AmbiPrincipal principal) {
        Deck deck = getEditable(id, principal);
        deck.setSettings(withDeckPointSettings(deck.getSettings(), pointSettings));
        deckRepository.updateDeckPointSettings(id, pointSettings);
        return deck;
    }

    /** Replace the deck's default answer (answering) settings (EDIT). */
    public Deck setDeckAnswerSettings(String id, Settings.AnswerSettings answerSettings, AmbiPrincipal principal) {
        Deck deck = getEditable(id, principal);
        deck.setSettings(withDeckAnswerSettings(deck.getSettings(), answerSettings));
        deckRepository.updateDeckAnswerSettings(id, answerSettings);
        return deck;
    }

    /** Replace the deck's audience (who-can-join + engagement) settings (EDIT). */
    public Deck setDeckAudienceSettings(String id, Settings.AudienceSettings audienceSettings, AmbiPrincipal principal) {
        Deck deck = getEditable(id, principal);
        deck.setSettings(withDeckAudienceSettings(deck.getSettings(), audienceSettings));
        deckRepository.updateDeckAudienceSettings(id, audienceSettings);
        return deck;
    }

    /** Replace the deck's invite-display (QR / room-code surfacing) settings (EDIT). */
    public Deck setDeckInviteSettings(String id, Settings.InviteSettings inviteSettings, AmbiPrincipal principal) {
        Deck deck = getEditable(id, principal);
        deck.setSettings(withDeckInviteSettings(deck.getSettings(), inviteSettings));
        deckRepository.updateDeckInviteSettings(id, inviteSettings);
        return deck;
    }

    // ── Promote settings to deck (apply to deck) ────────────────────────────────
    // A single atomic operation: set the new deck default AND clear all per-slide
    // overrides for that field. The slide hierarchy means a null per-slide value
    // falls through to the deck default, so after a promote every slide inherits
    // the value that was just pushed up. The in-memory deck object is updated too
    // so the returned DeckResponse reflects the change; slide objects in the
    // embedded list are cleared in-memory but the caller is expected to invalidate
    // any separate slide cache on the frontend.

    /**
     * Promote point settings to the deck default and clear all per-slide overrides
     * in one atomic update (EDIT).
     */
    public Deck promotePointSettingsToDeck(String id, Settings.PointSettings pointSettings, AmbiPrincipal principal) {
        Deck deck = getEditable(id, principal);
        deck.setSettings(withDeckPointSettings(deck.getSettings(), pointSettings));
        deck.getSlides().forEach(s -> s.setSettings(withPointSettings(s.getSettings(), null)));
        deckRepository.promoteSettingsToDeck(id, "pointSettings", pointSettings);
        return deck;
    }

    /**
     * Promote answer settings to the deck default and clear all per-slide overrides
     * in one atomic update (EDIT).
     */
    public Deck promoteAnswerSettingsToDeck(String id, Settings.AnswerSettings answerSettings, AmbiPrincipal principal) {
        Deck deck = getEditable(id, principal);
        deck.setSettings(withDeckAnswerSettings(deck.getSettings(), answerSettings));
        deck.getSlides().forEach(s -> s.setSettings(withAnswerSettings(s.getSettings(), null)));
        deckRepository.promoteSettingsToDeck(id, "answerSettings", answerSettings);
        return deck;
    }

    /** Replace one of a deck's settings sub-objects, preserving the others. */
    private static Settings.DeckSettings withDeckPointSettings(
            Settings.DeckSettings current, Settings.PointSettings points) {
        return new Settings.DeckSettings(points,
                current == null ? null : current.answerSettings(),
                current == null ? null : current.audienceSettings(),
                current == null ? null : current.inviteSettings());
    }

    /** As {@link #withDeckPointSettings}, replacing the answer sub-object. */
    private static Settings.DeckSettings withDeckAnswerSettings(
            Settings.DeckSettings current, Settings.AnswerSettings answers) {
        return new Settings.DeckSettings(
                current == null ? null : current.pointSettings(),
                answers,
                current == null ? null : current.audienceSettings(),
                current == null ? null : current.inviteSettings());
    }

    /** As {@link #withDeckPointSettings}, replacing the audience sub-object. */
    private static Settings.DeckSettings withDeckAudienceSettings(
            Settings.DeckSettings current, Settings.AudienceSettings audience) {
        return new Settings.DeckSettings(
                current == null ? null : current.pointSettings(),
                current == null ? null : current.answerSettings(),
                audience,
                current == null ? null : current.inviteSettings());
    }

    /** As {@link #withDeckPointSettings}, replacing the invite sub-object. */
    private static Settings.DeckSettings withDeckInviteSettings(
            Settings.DeckSettings current, Settings.InviteSettings invite) {
        return new Settings.DeckSettings(
                current == null ? null : current.pointSettings(),
                current == null ? null : current.answerSettings(),
                current == null ? null : current.audienceSettings(),
                invite);
    }

    private Slide applySlideMutation(String deckId, String slideId, AmbiPrincipal principal,
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
        if (!isPlatformAdmin(principal) && orgRoles.roleFor(orgId, userId(principal)) == null) {
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
        OrgRole orgRole = orgRoles.roleFor(deck, principal);
        return new ViewerPermissions(
                deck.canBeViewedBy(userId, level, orgRole),
                deck.canBeEditedBy(userId, level, orgRole),
                deck.canBeManagedBy(userId, level, orgRole));
    }

    /**
     * Write the deck's denormalized rating headline ({@code stats.ratingAverage} /
     * {@code ratingCount}) via a targeted sub-path {@code $set}, leaving the rest of
     * {@code stats} and the deck's {@code @Version} untouched. Called by the review
     * service after a rating write so the value the deck card and list views read
     * stays current; the full per-star distribution is served live from the reviews.
     */
    public void setRatingStats(String deckId, Double average, long count) {
        deckRepository.updateRatingStats(deckId, average, count);
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private Deck load(String id) {
        return deckRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("DECK_NOT_FOUND", "Deck not found"));
    }

    private void requireView(Deck deck, AmbiPrincipal principal) {
        if (!deck.canBeViewedBy(userId(principal), level(principal), orgRoles.roleFor(deck, principal))) {
            throw new ForbiddenException("DECK_VIEW_FORBIDDEN",
                    "You do not have access to this deck");
        }
    }

    private void requireEdit(Deck deck, AmbiPrincipal principal) {
        if (!deck.canBeEditedBy(userId(principal), level(principal), orgRoles.roleFor(deck, principal))) {
            throw new ForbiddenException("DECK_EDIT_FORBIDDEN",
                    "You do not have edit access to this deck");
        }
    }

    private void requireManage(Deck deck, AmbiPrincipal principal) {
        if (!deck.canBeManagedBy(userId(principal), level(principal), orgRoles.roleFor(deck, principal))) {
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
}
