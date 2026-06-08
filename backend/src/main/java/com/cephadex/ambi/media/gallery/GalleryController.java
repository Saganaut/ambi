package com.cephadex.ambi.media.gallery;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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

import java.io.IOException;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.gallery.dto.AddImageRequest;
import com.cephadex.ambi.media.gallery.dto.GalleryImageResponse;
import com.cephadex.ambi.media.gallery.dto.GalleryResponse;
import com.cephadex.ambi.media.gallery.dto.RenameGalleryRequest;
import com.cephadex.ambi.media.storage.ImageIngestService;

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
     */
    @GetMapping("/{id}/images")
    public PagedModel<GalleryImageResponse> listImages(
            @PathVariable String id,
            Pageable pageable,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return new PagedModel<>(galleryService.listImages(id, principal, pageable)
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
     * Add an image to a gallery by reference (EDIT) — an external URL, or a
     * pre-formed {@link AppImage}. The multipart sibling below ingests raw bytes;
     * the two share this path, disambiguated by {@code consumes}.
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
     * then persisted as a gallery item. {@code name} defaults to the original
     * filename when omitted.
     */
    @PostMapping(path = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public GalleryImageResponse uploadImage(
            @PathVariable String id,
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "name", required = false) String name,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        AppImage image = imageIngestService.ingest(
                bytesOf(file), file.getContentType(), file.getOriginalFilename());
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
