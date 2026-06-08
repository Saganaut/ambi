package com.cephadex.ambi.media.storage;

import java.util.LinkedHashSet;
import java.util.Set;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

/**
 * Media-serving and ingest tunables (prefix {@code ambi.media}), kept separate
 * from the raw S3 connection settings in {@link S3Properties} because they're
 * about <em>how images are processed and served</em>, not how we talk to the
 * bucket.
 *
 * <p>{@link #publicBaseUrl} is the origin prepended to a stored S3 key when an
 * internal {@link com.cephadex.ambi.media.AppImage} is hydrated to renderable
 * URLs on read (see {@link ImageUrlResolver}). It is <em>not</em> persisted, so
 * moving environments only requires changing this property — stored documents
 * keep holding opaque keys.
 */
@Data
@ConfigurationProperties(prefix = "ambi.media")
public class MediaProperties {

    /**
     * Origin the image-proxy URLs are built from (this backend's own public
     * address). Hydrated variant URLs look like
     * {@code {publicBaseUrl}/api/images/{key}}.
     */
    private String publicBaseUrl = "http://localhost:8080";

    /** Hard cap on a single uploaded file's size, in bytes (default 10 MB). */
    private long maxUploadBytes = 10L * 1024 * 1024;

    /** Content types accepted by the upload ingest. */
    private Set<String> allowedContentTypes = new LinkedHashSet<>(Set.of(
            "image/png", "image/jpeg", "image/webp", "image/gif"));
}
