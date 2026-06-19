package com.cephadex.ambi.media.storage;

import java.io.IOException;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.sksamuel.scrimage.ImmutableImage;
import com.sksamuel.scrimage.webp.WebpWriter;

/**
 * Turns an uploaded image's raw bytes into a stored, multi-tier
 * {@link AppImage}: it validates the payload, persists the untouched original,
 * then derives one WebP rendition per {@link ImageSizeOptions} tier (downscaled
 * to fit a bounding box, never upscaled) and stores each. The returned
 * {@code AppImage} carries the original's {@code srcKey} and a {@code variants}
 * map of tier → S3 key — the same embeddable value a client later copies into a
 * deck/slide/theme.
 *
 * <p>This is the ingest the {@code GalleryController} multipart route calls
 * before {@code GalleryService.addImage} persists the gallery item. The keys it
 * mints are hydrated to URLs on read by {@link ImageUrlResolver}.
 */
@Service
public class ImageIngestService {

    /**
     * Bounding-box edge (px) each tier is fit within, preserving aspect ratio.
     * A source smaller than a tier is stored at its own size (no upscaling), so
     * small originals simply share renditions across the larger tiers.
     */
    private static final Map<ImageSizeOptions, Integer> TIER_BOUNDS = Map.of(
            ImageSizeOptions.XS, 64,
            ImageSizeOptions.SM, 200,
            ImageSizeOptions.MD, 480,
            ImageSizeOptions.LG, 960,
            ImageSizeOptions.XL, 1600);

    private final S3StorageService storage;
    private final MediaProperties props;

    public ImageIngestService(S3StorageService storage, MediaProperties props) {
        this.storage = storage;
        this.props = props;
    }

    /**
     * Validate, store, and tier an uploaded image.
     *
     * @param bytes            the raw upload
     * @param contentType      the declared MIME type (validated against the allow-list)
     * @param originalFilename optional source filename, used for {@code altText}
     * @return the populated, S3-backed {@link AppImage}
     */
    public AppImage ingest(byte[] bytes, String contentType, String originalFilename) {
        validate(bytes, contentType);

        String prefix = "gallery/" + UUID.randomUUID();
        String originalKey = ImageKeys.originalKey(prefix);
        storage.put(originalKey, bytes, contentType);

        // AVIF cannot be decoded by Scrimage; store the original as-is with no variants.
        if ("image/avif".equalsIgnoreCase(contentType)) {
            AppImage image = new AppImage();
            image.setExternal(false);
            image.setSrcKey(originalKey);
            image.setVariants(new EnumMap<>(ImageSizeOptions.class));
            if (StringUtils.hasText(originalFilename)) {
                image.setAltText(originalFilename);
            }
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("originalContentType", contentType);
            image.setMetadata(metadata);
            return image;
        }

        ImmutableImage source;
        try {
            source = ImmutableImage.loader().fromBytes(bytes);
        } catch (IOException e) {
            throw new ValidationException("Uploaded file is not a readable image.");
        }

        Map<ImageSizeOptions, String> variants = new EnumMap<>(ImageSizeOptions.class);
        for (Map.Entry<ImageSizeOptions, Integer> tier : TIER_BOUNDS.entrySet()) {
            int bound = tier.getValue();
            byte[] webp = toWebp(source.bound(bound, bound));
            String key = ImageKeys.variantKey(prefix, tier.getKey());
            storage.put(key, webp, "image/webp");
            variants.put(tier.getKey(), key);
        }

        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey(originalKey);
        image.setVariants(variants);
        if (StringUtils.hasText(originalFilename)) {
            image.setAltText(originalFilename);
        }
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("width", source.width);
        metadata.put("height", source.height);
        metadata.put("originalContentType", contentType);
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

    private byte[] toWebp(ImmutableImage image) {
        try {
            return image.bytes(WebpWriter.DEFAULT);
        } catch (IOException e) {
            throw new MediaStorageException("Failed to encode image variant", e);
        }
    }
}
