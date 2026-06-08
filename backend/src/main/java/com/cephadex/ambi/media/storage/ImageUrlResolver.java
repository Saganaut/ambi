package com.cephadex.ambi.media.storage;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.web.util.UriUtils;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;

/**
 * Turns the opaque S3 keys an internal {@link AppImage} stores into renderable
 * URLs at read time — the "hydrate on read" half of the contract the frontend
 * {@code image.ts} documents: stored {@code variants} hold keys; the client
 * receives URLs.
 *
 * <p>Keys resolve to this backend's own image proxy
 * ({@code {publicBaseUrl}/api/images/{key}} — see {@code ImageController}), so
 * the bucket stays private and nothing host-specific is ever persisted. External
 * images (author pasted a URL) already carry a renderable {@code externalSrc}
 * and pass through untouched.
 */
@Component
public class ImageUrlResolver {

    private final String publicBaseUrl;

    public ImageUrlResolver(MediaProperties props) {
        // Trim a trailing slash so we don't emit "…//api/images/…".
        String base = props.getPublicBaseUrl();
        this.publicBaseUrl = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }

    /** The proxy URL that serves the object stored under {@code key}. */
    public String url(String key) {
        return publicBaseUrl + "/api/images/" + UriUtils.encodePath(key, "UTF-8");
    }

    /**
     * A copy of {@code image} with its internal {@code variants} (S3 keys)
     * rewritten to renderable proxy URLs. External images and null/empty inputs
     * are returned unchanged. The stored entity is never mutated.
     */
    public AppImage hydrate(AppImage image) {
        if (image == null || image.isExternal() || image.getVariants() == null
                || image.getVariants().isEmpty()) {
            return image;
        }
        Map<ImageSizeOptions, String> hydrated = new LinkedHashMap<>();
        for (Map.Entry<ImageSizeOptions, String> e : image.getVariants().entrySet()) {
            hydrated.put(e.getKey(), url(e.getValue()));
        }
        AppImage copy = new AppImage();
        copy.setId(image.getId());
        copy.setExternal(false);
        copy.setSrcKey(image.getSrcKey());
        copy.setExternalSrc(image.getExternalSrc());
        copy.setAltText(image.getAltText());
        copy.setVariants(hydrated);
        copy.setMetadata(image.getMetadata());
        return copy;
    }
}
