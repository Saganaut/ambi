package com.cephadex.ambi.media.storage;

import java.io.IOException;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.variants.ImageVariantRequests;
import com.sksamuel.scrimage.ImmutableImage;

/**
 * Turns an uploaded image's raw bytes into a stored {@link AppImage}: it
 * validates the payload, decodes it for its dimensions, persists the untouched
 * original, and enqueues the WebP renditions for an out-of-process worker to
 * render. The returned {@code AppImage} carries the original's {@code srcKey}
 * and the <em>canonical</em> tier → key map — the same embeddable value a client
 * later copies into a deck/slide/theme.
 *
 * <p><strong>The variants map is a layout, not a promise.</strong> Nothing is
 * rendered by the time this returns; the keys are simply where each rendition
 * will live. What makes the map truthful is the pending row
 * ({@link ImageVariantRequests}) — opened <em>before</em> the original is
 * stored, so no reader can ever observe the key root without it — which
 * {@link ImageUrlResolver} consults to drop the tiers that aren't there yet.
 * That ordering is why opening the row is fatal to an upload while failing to
 * enqueue the job is not: a lost job leaves the image serving its original until
 * a repair sweep re-publishes, whereas a lost row would advertise five
 * renditions that do not exist.
 *
 * <p>Decoding stays here even though nothing is resized: it is what proves the
 * bytes are an image (a corrupt upload must 400, not become a permanently
 * failed job) and what produces {@code metadata.width}/{@code height}. AVIF is
 * the one exception — Scrimage cannot decode it, so it skips straight to
 * storage and is enqueued like everything else, the worker's decoder being the
 * one that has to cope.
 *
 * <p>This is the ingest the {@code GalleryController} multipart route calls
 * before {@code GalleryService.addImage} persists the gallery item. The keys it
 * mints are hydrated to URLs on read by {@link ImageUrlResolver}.
 */
@Service
public class ImageIngestService {

    private static final String AVIF_CONTENT_TYPE = "image/avif";

    private final S3StorageService storage;
    private final MediaProperties props;
    private final ImageVariantRequests variantRequests;

    public ImageIngestService(S3StorageService storage, MediaProperties props,
            ImageVariantRequests variantRequests) {
        this.storage = storage;
        this.props = props;
        this.variantRequests = variantRequests;
    }

    /**
     * Validate, store, and enqueue an uploaded gallery image (keys minted under
     * the {@code gallery/} namespace).
     *
     * @param bytes            the raw upload
     * @param contentType      the declared MIME type (validated against the allow-list)
     * @param originalFilename optional source filename, used for {@code altText}
     * @return the populated, S3-backed {@link AppImage}
     */
    public AppImage ingest(byte[] bytes, String contentType, String originalFilename) {
        return ingest(bytes, contentType, originalFilename, "gallery/" + UUID.randomUUID());
    }

    /**
     * Validate, store, and enqueue an uploaded image under an explicit key
     * {@code prefix}. Lets non-gallery flows (e.g. live-session drawing
     * answers) keep their objects in their own namespace so ownership checks
     * and cleanup can key off the prefix.
     */
    public AppImage ingest(byte[] bytes, String contentType, String originalFilename, String prefix) {
        validate(bytes, contentType);

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("originalContentType", contentType);
        if (!AVIF_CONTENT_TYPE.equalsIgnoreCase(contentType)) {
            ImmutableImage source = decode(bytes);
            metadata.put("width", source.width);
            metadata.put("height", source.height);
        }

        String originalKey = ImageKeys.originalKey(prefix);
        Set<ImageSizeOptions> tiers = EnumSet.allOf(ImageSizeOptions.class);
        // Ordered around the PUT: the moment the original lands, another request
        // can be handed this key root, and it must never find "no row" while the
        // renditions are still missing.
        variantRequests.open(prefix, tiers, contentType);
        storage.put(originalKey, bytes, contentType);
        variantRequests.publish(prefix, originalKey, tiers, contentType);

        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey(originalKey);
        image.setVariants(ImageKeys.variantsFor(originalKey));
        if (StringUtils.hasText(originalFilename)) {
            image.setAltText(originalFilename);
        }
        image.setMetadata(metadata);
        return image;
    }

    private void validate(byte[] bytes, String contentType) {
        if (bytes == null || bytes.length == 0) {
            throw new ValidationException("Uploaded file is empty.");
        }
        if (bytes.length > props.getMaxUploadBytes()) {
            throw new ValidationException(
                    "Image exceeds the maximum size of " + (props.getMaxUploadBytes() / (1024 * 1024)) + " MB.");
        }
        if (contentType == null || !props.getAllowedContentTypes().contains(contentType.toLowerCase())) {
            throw new ValidationException(
                    "Unsupported image type. Allowed: " + String.join(", ", props.getAllowedContentTypes()) + ".");
        }
    }

    /** Decode for validation + dimensions, before anything is written or enqueued. */
    private ImmutableImage decode(byte[] bytes) {
        try {
            return ImmutableImage.loader().fromBytes(bytes);
        } catch (IOException e) {
            throw new ValidationException("Uploaded file is not a readable image.");
        }
    }
}
