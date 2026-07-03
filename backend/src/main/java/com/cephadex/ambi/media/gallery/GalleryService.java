package com.cephadex.ambi.media.gallery;

import static com.cephadex.ambi.auth.security.AmbiPrincipals.isPlatformAdmin;
import static com.cephadex.ambi.auth.security.AmbiPrincipals.level;
import static com.cephadex.ambi.auth.security.AmbiPrincipals.requireUserId;
import static com.cephadex.ambi.auth.security.AmbiPrincipals.userId;

import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.Ownership;
import com.cephadex.ambi.common.ViewerPermissions;
import com.cephadex.ambi.common.enums.OwnershipType;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.storage.ImageKeys;
import com.cephadex.ambi.media.storage.S3StorageService;
import com.cephadex.ambi.org.OrgRoleResolver;
import com.cephadex.ambi.org.enums.OrgRole;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * CRUD for {@link Gallery} and its {@link GalleryImage}s, gated by the rules the
 * {@code Gallery} aggregate owns ({@code canBeViewedBy} / {@code canBeEditedBy} /
 * {@code canBeManagedBy}). This service decides which capability an operation
 * needs, resolves the requester's org role, and turns a denial into a typed
 * {@code ApiException} — mirroring {@code DeckService} / {@code ThemeService}.
 *
 * <p>Galleries are reached by ownership, not by id: each owner has exactly one
 * (a unique index enforces it), provisioned lazily on first access via the
 * {@code getOrCreate*} methods. Images are authorized through their owning
 * gallery — there is no standalone image permission.
 */
@Service
public class GalleryService {

    private final GalleryRepository galleryRepository;
    private final GalleryImageRepository imageRepository;
    private final OrgRoleResolver orgRoles;
    private final S3StorageService storage;

    public GalleryService(GalleryRepository galleryRepository,
            GalleryImageRepository imageRepository, OrgRoleResolver orgRoles,
            S3StorageService storage) {
        this.galleryRepository = galleryRepository;
        this.imageRepository = imageRepository;
        this.orgRoles = orgRoles;
        this.storage = storage;
    }

    // ── Get-or-create ─────────────────────────────────────────────────────────
    // A gallery is a singleton per owner, so there is no explicit create: the
    // first access provisions it. The unique owner index makes this safe under a
    // concurrent double-call — we lose the insert race and re-read the winner.

    /** The caller's personal gallery, created on first access. */
    public Gallery getOrCreateForUser(AmbiPrincipal principal) {
        String userId = requireUserId(principal);
        return galleryRepository
                .findByOwnershipTypeAndOwnershipOwnerId(OwnershipType.USER, userId)
                .orElseGet(() -> insert(new Ownership(OwnershipType.USER, userId), null, userId));
    }

    /**
     * An organization's gallery. Any member may read it; the first access by a
     * member provisions it, but provisioning requires an OWNER/ADMIN — a plain
     * member browsing an org that has no gallery yet gets an empty 404-free read
     * only once a manager has created it.
     */
    public Gallery getOrCreateForOrg(String orgId, AmbiPrincipal principal) {
        String userId = requireUserId(principal);
        Optional<Gallery> existing = galleryRepository.findByOrganizationId(orgId);
        if (existing.isPresent()) {
            requireView(existing.get(), principal);
            return existing.get();
        }
        requireOrgManager(orgId, principal);
        return insert(new Ownership(OwnershipType.ORGANIZATION, orgId), orgId, userId);
    }

    private Gallery insert(Ownership ownership, String organizationId, String creatorUserId) {
        try {
            Gallery gallery = new Gallery();
            gallery.setId(UUID.randomUUID().toString());
            gallery.setOwnership(ownership);
            gallery.setOrganizationId(organizationId);
            gallery.setCreatorUserId(creatorUserId);
            return galleryRepository.save(gallery);
        } catch (DuplicateKeyException lostRace) {
            // A concurrent call won the unique owner index — return the winner.
            return galleryRepository
                    .findByOwnershipTypeAndOwnershipOwnerId(ownership.type(), ownership.ownerId())
                    .orElseThrow(() -> lostRace);
        }
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    /** Load a gallery the requester is allowed to VIEW, else 403/404. */
    public Gallery getViewable(String id, AmbiPrincipal principal) {
        Gallery gallery = load(id);
        requireView(gallery, principal);
        return gallery;
    }

    // ── Manage ──────────────────────────────────────────────────────────────────

    /** Rename a gallery (MANAGE). */
    public Gallery rename(String id, String name, AmbiPrincipal principal) {
        Gallery gallery = load(id);
        requireManage(gallery, principal);
        gallery.setName(name.trim());
        return galleryRepository.save(gallery);
    }

    /** Delete a gallery and all its images (MANAGE). Embedded copies in decks survive. */
    public void delete(String id, AmbiPrincipal principal) {
        Gallery gallery = load(id);
        requireManage(gallery, principal);
        imageRepository.deleteByGalleryId(gallery.getId());
        galleryRepository.delete(gallery);
    }

    // ── Images ──────────────────────────────────────────────────────────────────
    // Authorized through the owning gallery: load it, gate on its VIEW/EDIT, then
    // touch the separate gallery_images collection.

    /** A gallery's images (VIEW). */
    public Page<GalleryImage> listImages(String galleryId, AmbiPrincipal principal, Pageable pageable) {
        Gallery gallery = getViewable(galleryId, principal);
        return imageRepository.findByGalleryId(gallery.getId(), pageable);
    }

    /**
     * A single image of a gallery (VIEW) — the "select" read. The caller copies
     * the returned {@link AppImage} into a usage site via that resource's own
     * image endpoint.
     */
    public GalleryImage getImage(String galleryId, String imageId, AmbiPrincipal principal) {
        Gallery gallery = getViewable(galleryId, principal);
        return imageRepository.findByIdAndGalleryId(imageId, gallery.getId())
                .orElseThrow(() -> new NotFoundException("GALLERY_IMAGE_NOT_FOUND", "Image not found"));
    }

    /**
     * Add an image to a gallery (EDIT). Callers supply an already-formed
     * {@link AppImage}: an external reference, or the S3-backed value the
     * multipart upload route produces via {@code ImageIngestService} before this
     * same persist.
     */
    public GalleryImage addImage(String galleryId, AppImage image, String name, AmbiPrincipal principal) {
        Gallery gallery = load(galleryId);
        requireEdit(gallery, principal);

        GalleryImage galleryImage = new GalleryImage();
        galleryImage.setId(UUID.randomUUID().toString());
        galleryImage.setGalleryId(gallery.getId());
        galleryImage.setImage(image);
        galleryImage.setName(name);
        galleryImage.setCreatorUserId(userId(principal));
        return imageRepository.save(galleryImage);
    }

    /**
     * Remove an image from a gallery (EDIT). The backing S3 objects (original +
     * every variant) are deleted first so we never orphan the document onto
     * missing bytes; only once they're gone do we drop the document.
     *
     * <p><strong>Shared-bytes caveat:</strong> when a usage site selects this
     * image it embeds a copy of the {@link AppImage}, which references the
     * <em>same</em> content-addressed S3 keys. Deleting the bytes here therefore
     * also blanks any deck/slide that selected this image. Independent per-copy
     * bytes would need copy-time object duplication or reference counting; until
     * then, "delete frees the bytes" is the intended behaviour.
     */
    public void removeImage(String galleryId, String imageId, AmbiPrincipal principal) {
        Gallery gallery = load(galleryId);
        requireEdit(gallery, principal);
        GalleryImage image = imageRepository.findByIdAndGalleryId(imageId, gallery.getId())
                .orElseThrow(() -> new NotFoundException("GALLERY_IMAGE_NOT_FOUND", "Image not found"));
        storage.delete(ImageKeys.allKeys(image.getImage()));
        imageRepository.delete(image);
    }

    // ── Permissions / counts ────────────────────────────────────────────────────

    /**
     * The requesting principal's capabilities over this gallery, from the same
     * predicates the {@code require*} guards use. Personal galleries resolve
     * without I/O; org-owned galleries cost one user lookup for the org role.
     */
    public ViewerPermissions permissionsFor(Gallery gallery, AmbiPrincipal principal) {
        String userId = userId(principal);
        UserLevel level = level(principal);
        OrgRole orgRole = orgRoles.roleFor(gallery, principal);
        return new ViewerPermissions(
                gallery.canBeViewedBy(userId, level, orgRole),
                gallery.canBeEditedBy(userId, level, orgRole),
                gallery.canBeManagedBy(userId, level, orgRole));
    }

    /** How many images a gallery holds — stamped onto its response. */
    public long imageCount(String galleryId) {
        return imageRepository.countByGalleryId(galleryId);
    }

    // ── Internals ───────────────────────────────────────────────────────────────

    private Gallery load(String id) {
        return galleryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("GALLERY_NOT_FOUND", "Gallery not found"));
    }

    private void requireView(Gallery gallery, AmbiPrincipal principal) {
        if (!gallery.canBeViewedBy(userId(principal), level(principal), orgRoles.roleFor(gallery, principal))) {
            throw new ForbiddenException("GALLERY_VIEW_FORBIDDEN",
                    "You do not have access to this gallery");
        }
    }

    private void requireEdit(Gallery gallery, AmbiPrincipal principal) {
        if (!gallery.canBeEditedBy(userId(principal), level(principal), orgRoles.roleFor(gallery, principal))) {
            throw new ForbiddenException("GALLERY_EDIT_FORBIDDEN",
                    "You do not have edit access to this gallery");
        }
    }

    private void requireManage(Gallery gallery, AmbiPrincipal principal) {
        if (!gallery.canBeManagedBy(userId(principal), level(principal), orgRoles.roleFor(gallery, principal))) {
            throw new ForbiddenException("GALLERY_MANAGE_FORBIDDEN",
                    "You do not have permission to manage this gallery");
        }
    }

    private void requireOrgManager(String orgId, AmbiPrincipal principal) {
        if (isPlatformAdmin(principal)) {
            return;
        }
        OrgRole role = orgRoles.roleFor(orgId, userId(principal));
        if (role != OrgRole.OWNER && role != OrgRole.ADMIN) {
            throw new ForbiddenException("GALLERY_MANAGE_FORBIDDEN",
                    "You do not have permission to create a gallery for this organization");
        }
    }
}
