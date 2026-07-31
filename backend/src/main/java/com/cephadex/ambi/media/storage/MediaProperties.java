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
 * is signed on read, cached per key, and expires after {@link #presignTtl}. The
 * resolver reuses a cached URL until it is within {@link #presignRefreshMargin}
 * of expiry, so repeated reads of the same image hand back the identical string
 * (no client-side image churn) without ever serving a URL about to die.
 *
 * <p>The one read path that cannot presign is the opaque proxy
 * ({@link OpaqueImageUrls}): a presigned URL spells its object's key out, which
 * is a tell on a board that mixes authored and submitted images. Its own secret
 * and TTL live here too.
 */
@Data
@ConfigurationProperties(prefix = "ambi.media")
public class MediaProperties {

    /**
     * How long a presigned image URL stays valid. Long enough that a page open
     * for a while keeps rendering, short enough that a leaked URL soon dies.
     */
    private Duration presignTtl = Duration.ofHours(1);

    /**
     * How long before a cached presigned URL's expiry the resolver re-signs.
     * The reuse window is {@code presignTtl - presignRefreshMargin}: within it,
     * every read returns the same cached URL; past it, the next read re-signs.
     * The margin guarantees a handed-out URL always has at least this much life
     * left, so a client that loads it just before refresh still renders. Must be
     * shorter than {@link #presignTtl}.
     */
    private Duration presignRefreshMargin = Duration.ofMinutes(15);

    /**
     * Upper bound on distinct keys held in the presigned-URL cache. Each gallery
     * image contributes up to six keys (the original plus one per size tier), so
     * the default holds roughly 1,600 images before eviction.
     */
    private long presignCacheMaxSize = 10_000;

    /**
     * HMAC secret behind the opaque image-proxy tokens (see
     * {@link OpaqueImageUrls}). MUST be overridden in production — the token is
     * a bearer capability over one S3 key, so anyone holding the secret can mint
     * their own. {@link OpaqueImageUrls} refuses to start on an unset or
     * shorter-than-32-character value.
     */
    private String opaqueTokenSecret;

    /**
     * How long an opaque image token stays valid. Six hours by default, matching
     * the TTL of the Redis round snapshots those URLs are frozen into
     * ({@code SessionRedisProperties}) — a shorter one would leave a still-live
     * follow-up board rendering dead links.
     */
    private Duration opaqueTokenTtl = Duration.ofHours(6);

    /**
     * Origin the opaque image URLs are minted absolute against, e.g.
     * {@code https://api.example.com}. Needed because the browser rendering them
     * is on the frontend's origin, which is a different one in dev. Blank mints
     * root-relative URLs, for a deployment that serves both halves from one
     * origin.
     */
    private String publicBaseUrl = "";

    /** Hard cap on a single uploaded file's size, in bytes (default 10 MB). */
    private long maxUploadBytes = 10L * 1024 * 1024;

    /** Content types accepted by the upload ingest. */
    private Set<String> allowedContentTypes = new LinkedHashSet<>(Set.of(
            "image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"));

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
