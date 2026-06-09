package com.cephadex.ambi.media.storage;

import java.time.Duration;
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
 * <p>Internal images are served via short-lived presigned URLs (see
 * {@link ImageUrlResolver}): the bucket stays private, and a stored
 * {@link com.cephadex.ambi.media.AppImage} only ever holds opaque keys — the URL
 * is regenerated on every read and expires after {@link #presignTtl}.
 */
@Data
@ConfigurationProperties(prefix = "ambi.media")
public class MediaProperties {

    /**
     * How long a presigned image URL stays valid. Long enough that a page open
     * for a while keeps rendering, short enough that a leaked URL soon dies;
     * every fresh read re-signs, so a reload always yields working URLs.
     */
    private Duration presignTtl = Duration.ofHours(1);

    /** Hard cap on a single uploaded file's size, in bytes (default 10 MB). */
    private long maxUploadBytes = 10L * 1024 * 1024;

    /** Content types accepted by the upload ingest. */
    private Set<String> allowedContentTypes = new LinkedHashSet<>(Set.of(
            "image/png", "image/jpeg", "image/webp", "image/gif"));

    /**
     * Connect/read timeout for the SSRF-guarded remote-image fetch (the proxy
     * that lets the browser load a pasted URL for client-side cropping without
     * canvas CORS-taint). Kept short so a slow or hanging host can't pin a
     * request thread.
     */
    private Duration remoteFetchTimeout = Duration.ofSeconds(10);

    /**
     * How many redirects the remote-image fetch will follow. Each hop is
     * re-validated against the SSRF guards, so this only bounds chain length;
     * 0 disables redirects entirely.
     */
    private int remoteFetchMaxRedirects = 3;
}
