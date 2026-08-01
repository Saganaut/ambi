package com.cephadex.ambi.media.gallery;

import java.io.IOException;
import java.time.Duration;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.gallery.dto.AddImageRequest;
import com.cephadex.ambi.media.gallery.dto.GalleryImageResponse;
import com.cephadex.ambi.media.gallery.dto.GalleryResponse;
import com.cephadex.ambi.media.gallery.dto.RenameGalleryRequest;
import com.cephadex.ambi.media.storage.ImageIngestService;
import com.cephadex.ambi.media.storage.S3StorageService.StoredObject;

import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;

/**
 * HTTP surface for the {@link Gallery} aggregate and its images. Every route
 * delegates straight to {@link GalleryService}, which owns the permission rules:
 * the controller only resolves the caller's {@link AmbiPrincipal}, maps DTOs, and
 * lets the service throw the typed {@code ApiException}s the global handler turns
 * into RFC 9457 problem responses.
 *
 * <p>A gallery is reached by ownership, not by guessing its id: {@code GET /mine}
 * returns the caller's (creating it on first access) and {@code GET ?orgId=}
 * returns an org's. Its images are a paginated sub-resource under
 * {@code /{id}/images}; the metadata read carries only a count, keeping payloads
 * small. Selecting an image to use elsewhere is a plain {@code GET} of that image
 * followed by the consuming resource's own image endpoint.
 */
@RestController
@RequestMapping("/api/galleries")
public class GalleryController {

    // Short enough that a re-cropped-and-replaced source is never served stale
    // for long, long enough to cover a user re-opening the picker in a sitting.
    private static final Duration FILE_CACHE_TTL = Duration.ofMinutes(5);

    private final GalleryService galleryService;
    private final ImageIngestService imageIngestService;

    public GalleryController(GalleryService galleryService, ImageIngestService imageIngestService) {
        this.galleryService = galleryService;
        this.imageIngestService = imageIngestService;
    }

    // ── Gallery ───────────────────────────────────────────────────────────────

    /** The caller's personal gallery, created on first access. */
    @GetMapping("/mine")
    public GalleryResponse getMyGallery(@AuthenticationPrincipal AmbiPrincipal principal) {
        return toResponse(galleryService.getOrCreateForUser(principal), principal);
    }

    /**
     * An organization's gallery (VIEW for any member). A manager's first access
     * provisions it; see {@link GalleryService#getOrCreateForOrg}.
     */
    @GetMapping(params = "orgId")
    public GalleryResponse getOrgGallery(
            @RequestParam String orgId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return toResponse(galleryService.getOrCreateForOrg(orgId, principal), principal);
    }

    /** Read a gallery's metadata by id (VIEW). */
    @GetMapping("/{id}")
    public GalleryResponse getGallery(
            @PathVariable String id,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return toResponse(galleryService.getViewable(id, principal), principal);
    }

    /** Rename a gallery (MANAGE). */
    @PatchMapping("/{id}")
    public GalleryResponse renameGallery(
            @PathVariable String id,
            @Valid @RequestBody RenameGalleryRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return toResponse(galleryService.rename(id, body.name(), principal), principal);
    }

    /** Delete a gallery and all its images (MANAGE). */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGallery(
            @PathVariable String id,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        galleryService.delete(id, principal);
    }

    // ── Images (sub-resource of a gallery) ──────────────────────────────────────

    /**
     * A gallery's images (VIEW). Returned as a {@link PagedModel} — the stable,
     * self-describing page envelope ({@code content} + {@code page} metadata).
     *
     * <p>Browsing is server-driven: {@code page}/{@code size}/{@code sort} bind to
     * the {@link Pageable} and the optional {@code search} term narrows the page to
     * images whose name contains it (case-insensitive). Sorting is limited to
     * {@code name} and {@code createdAt} and the size is capped — see
     * {@code GalleryService.sanitize}.
     */
    @GetMapping("/{id}/images")
    public PagedModel<GalleryImageResponse> listImages(
            @PathVariable String id,
            @RequestParam(required = false) String search,
            Pageable pageable,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return new PagedModel<>(galleryService.listImages(id, principal, search, pageable)
                .map(GalleryImageResponse::from));
    }

    /** A single image of a gallery (VIEW) — the select read. */
    @GetMapping("/{id}/images/{imageId}")
    public GalleryImageResponse getImage(
            @PathVariable String id,
            @PathVariable String imageId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return GalleryImageResponse.from(galleryService.getImage(id, imageId, principal));
    }

    /**
     * The raw bytes of a gallery image's original (VIEW) — a same-origin read of
     * the stored object, so the browser can draw an image it already owns onto a
     * canvas (re-cropping it for a differently shaped slot) without tainting it.
     * The presigned URLs a normal read hands out are cross-origin and carry no
     * CORS headers, which makes them render-only; {@code /api/media/remote-image}
     * is no substitute either, since its SSRF guards reject the storage endpoint.
     *
     * <p>Cached {@code private} and briefly: the bytes are per-user authorized,
     * and content-addressed keys mean a hit is never stale within its lifetime.
     *
     * <p>{@link Hidden} from OpenAPI for the same reason as
     * {@code RemoteImageController}: it returns raw image bytes rather than a
     * typed JSON resource, so a generated RTK Query hook could only mis-parse it.
     * The frontend reads it with a plain authenticated {@code fetch} → {@code Blob}.
     */
    @Hidden
    @GetMapping("/{id}/images/{imageId}/file")
    public ResponseEntity<byte[]> getImageFile(
            @PathVariable String id,
            @PathVariable String imageId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        StoredObject stored = galleryService.getImageFile(id, imageId, principal);
        return ResponseEntity.ok()
                .contentType(contentTypeOf(stored))
                .cacheControl(CacheControl.maxAge(FILE_CACHE_TTL).cachePrivate())
                .body(stored.bytes());
    }

    /** The stored content type, falling back to a generic image when absent. */
    private static MediaType contentTypeOf(StoredObject stored) {
        String contentType = stored.contentType();
        return StringUtils.hasText(contentType)
                ? MediaType.parseMediaType(contentType)
                : MediaType.APPLICATION_OCTET_STREAM;
    }

    /**
     * Add an image to a gallery by reference (EDIT) — an external URL, or a
     * pre-formed {@link AppImage}. The multipart sibling below ({@code /upload})
     * ingests raw bytes instead; the two are distinct operations on distinct
     * paths so the generated OpenAPI client can represent each on its own.
     */
    @PostMapping(path = "/{id}/images", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public GalleryImageResponse addImage(
            @PathVariable String id,
            @Valid @RequestBody AddImageRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return GalleryImageResponse.from(
                galleryService.addImage(id, body.image(), body.name(), principal));
    }

    /**
     * Upload an image file to a gallery (EDIT). The bytes are validated, the
     * original stored, and one WebP rendition per size tier derived
     * ({@link ImageIngestService}); the resulting S3-backed {@link AppImage} is
     * then persisted as a gallery item. {@code name} (the gallery item's label)
     * defaults to the original filename when omitted; {@code altText}, when
     * supplied, is stamped onto the {@link AppImage} so it travels with the image
     * wherever it is later embedded.
     */
    @PostMapping(path = "/{id}/images/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public GalleryImageResponse uploadImage(
            @PathVariable String id,
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "altText", required = false) String altText,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        AppImage image = imageIngestService.ingest(
                bytesOf(file), file.getContentType(), file.getOriginalFilename());
        if (StringUtils.hasText(altText)) {
            image.setAltText(altText);
        }
        String label = (name != null && !name.isBlank()) ? name : file.getOriginalFilename();
        return GalleryImageResponse.from(galleryService.addImage(id, image, label, principal));
    }

    private static byte[] bytesOf(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new ValidationException("Could not read the uploaded file.");
        }
    }

    /** Remove an image from a gallery (EDIT). */
    @DeleteMapping("/{id}/images/{imageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeImage(
            @PathVariable String id,
            @PathVariable String imageId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        galleryService.removeImage(id, imageId, principal);
    }

    /** Map a gallery to its response, stamped with the caller's computed permissions. */
    private GalleryResponse toResponse(Gallery gallery, AmbiPrincipal principal) {
        return GalleryResponse.from(
                gallery,
                galleryService.imageCount(gallery.getId()),
                galleryService.permissionsFor(gallery, principal));
    }
}
