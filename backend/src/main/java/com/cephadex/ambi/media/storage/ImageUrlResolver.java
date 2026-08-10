package com.cephadex.ambi.media.storage;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.variants.ImageVariantReadiness;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

/**
 * Turns the opaque S3 keys an internal {@link AppImage} stores into renderable
 * URLs at read time — the "hydrate on read" half of the contract the frontend
 * {@code image.ts} documents: stored {@code srcKey}/{@code variants} hold keys;
 * the client receives ready-to-use URLs and never has to build any itself.
 *
 * <p>Those URLs are <em>presigned</em> GET URLs (SigV4) with a short TTL, so the
 * bucket stays private and access is time-limited. They are deliberately never
 * persisted: the raw key is the source of truth, and on write
 * {@link #keyFromUrl(String)} recovers it from a presigned URL the client echoes
 * back (see {@code AppImageDeserializer}). External images already carry a
 * renderable {@code externalSrc} and pass through.
 *
 * <p>A signed URL is <em>cached per key</em> and reused until it is within
 * {@code presignRefreshMargin} of expiry, then re-signed. This keeps repeated
 * reads of the same image returning the identical string, so a client never
 * sees the {@code <img src>} / CSS background change — and thus never reloads
 * the image — when an unrelated edit re-serializes the same {@link AppImage}.
 * The security posture is unchanged: a URL still expires at its signed time; a
 * cached URL is reused but never extended, and is only handed out while at least
 * {@code margin} of its life remains.
 *
 * <p>Reuse is validated against the <em>wall clock</em> ({@link Clock}), not
 * Caffeine's {@code expireAfterWrite}: Caffeine ticks on {@code System.nanoTime()}
 * (Linux {@code CLOCK_MONOTONIC}), which pauses while the host is suspended.
 * A URL's signed lifetime is wall-clock time, so after a suspend/resume a
 * monotonic-expiry cache would keep handing out an already-dead URL — to every
 * request, page refreshes included — until its paused window ran out.
 *
 * <p><strong>Readiness filtering.</strong> A stored {@code variants} map is the
 * canonical key <em>layout</em>, not a claim that every object exists:
 * renditions are rendered out of process after the original lands, and
 * {@code AppImageDeserializer} rebuilds all five keys from {@code srcKey}
 * regardless. So every read path here first drops the tiers
 * {@link ImageVariantReadiness} says are still missing — {@link #hydrate} and
 * {@link #displayKey} alike, the latter because it feeds the opaque-URL and
 * live-session board paths, which never run the serializer. What survives the
 * filter is guaranteed to be in the bucket; when nothing does, the untouched
 * original is the rendition.
 */
@Component
public class ImageUrlResolver {

    /** A cached signature plus the wall-clock instant after which it must be re-signed. */
    private record SignedUrl(String url, Instant refreshAt) {
    }

    private final S3Presigner presigner;
    private final String bucket;
    private final Duration ttl;
    private final Clock clock;
    private final ImageVariantReadiness readiness;
    /** How long a signed URL is reused: {@code presignTtl - presignRefreshMargin}. */
    private final Duration reuseWindow;
    /** key → signed URL, re-signed once {@code refreshAt} passes; size-bounded only. */
    private final Cache<String, SignedUrl> urlCache;

    @Autowired
    public ImageUrlResolver(S3Presigner presigner, S3Properties s3Props, MediaProperties mediaProps,
            ImageVariantReadiness readiness) {
        this(presigner, s3Props, mediaProps, readiness, Clock.systemUTC());
    }

    /** Package-private seam: lets a test drive URL expiry with a virtual {@link Clock}. */
    ImageUrlResolver(S3Presigner presigner, S3Properties s3Props, MediaProperties mediaProps,
            ImageVariantReadiness readiness, Clock clock) {
        this.presigner = presigner;
        this.readiness = readiness;
        this.bucket = s3Props.getBucket();
        this.ttl = mediaProps.getPresignTtl();
        this.clock = clock;
        this.reuseWindow = ttl.minus(mediaProps.getPresignRefreshMargin());
        // Fail fast on a misconfigured margin, as Caffeine's expireAfterWrite
        // (which used to receive this duration) did. A negative window would not
        // serve stale URLs — it would just silently re-sign on every read.
        if (reuseWindow.isNegative()) {
            throw new IllegalArgumentException(
                    "ambi.media.presign-refresh-margin (" + mediaProps.getPresignRefreshMargin()
                            + ") must not exceed presign-ttl (" + ttl + ")");
        }
        this.urlCache = Caffeine.newBuilder()
                .maximumSize(mediaProps.getPresignCacheMaxSize())
                .build();
    }

    /**
     * A short-lived presigned GET URL for the object stored under {@code key},
     * reused from cache while it stays comfortably clear of expiry.
     */
    public String url(String key) {
        Instant now = clock.instant();
        return urlCache.asMap()
                .compute(key, (k, cached) -> cached != null && now.isBefore(cached.refreshAt())
                        ? cached
                        : new SignedUrl(sign(k), now.plus(reuseWindow)))
                .url();
    }

    /** Mint a fresh presigned GET URL for {@code key}. */
    private String sign(String key) {
        GetObjectRequest get = GetObjectRequest.builder().bucket(bucket).key(key).build();
        GetObjectPresignRequest presign = GetObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .getObjectRequest(get)
                .build();
        return presigner.presignGetObject(presign).url().toString();
    }

    /**
     * The inverse of {@link #url(String)}: the raw S3 key behind a presigned URL.
     * A value that isn't an http(s) URL is assumed to already be a key and is
     * returned unchanged (so server-built images and legacy keys pass through).
     * Relies on path-style addressing ({@code endpoint/bucket/key}), which Garage
     * requires and {@code S3Config} enables.
     */
    public String keyFromUrl(String value) {
        if (value == null || (!value.startsWith("http://") && !value.startsWith("https://"))) {
            return value;
        }
        String path = URI.create(value).getPath(); // /{bucket}/{key}
        String prefix = "/" + bucket + "/";
        int idx = path.indexOf(prefix);
        return idx >= 0 ? path.substring(idx + prefix.length()) : path.replaceFirst("^/", "");
    }

    /**
     * A single renderable URL for {@code image} at (or nearest) the
     * {@code preferred} rendition tier: an external image passes through its
     * {@code externalSrc}; an internal one resolves the closest stored variant —
     * walking up to larger tiers before settling for smaller ones, then falling
     * back to the untouched original, mirroring the frontend's
     * {@code variantFor} — and presigns it. Returns {@code null} when
     * {@code image} is null or carries nothing renderable. For consumers that
     * need one URL rather than the whole hydrated object (e.g. the live-session
     * views, whose wire path can't run the {@code AppImage} serializer).
     */
    public String displayUrl(AppImage image, ImageSizeOptions preferred) {
        if (image == null) {
            return null;
        }
        if (image.isExternal()) {
            String src = image.getExternalSrc();
            return src == null || src.isBlank() ? null : src;
        }
        String key = displayKey(image, preferred);
        return key == null ? null : url(key);
    }

    /**
     * The stored S3 key {@link #displayUrl} would presign — the tier-walk on its
     * own, for a caller that serves the object some other way than a presigned
     * URL (see {@link OpaqueImageUrls}). {@code null} when {@code image} is null,
     * external (it owns no stored object), or carries no stored object at all.
     *
     * <p>A partially (or not yet) tiered image is normal: renditions are derived
     * after the original lands, so the tiers that survive the readiness filter
     * fill in over time. When no tier answers, the untouched original is the
     * rendition — bigger than the caller asked for, but always present and
     * always right.
     */
    public String displayKey(AppImage image, ImageSizeOptions preferred) {
        if (image == null || image.isExternal()) {
            return null;
        }
        Map<ImageSizeOptions, String> variants = readyVariants(image);
        if (variants != null) {
            ImageSizeOptions[] tiers = ImageSizeOptions.values();
            for (int i = preferred.ordinal(); i < tiers.length; i++) {
                String key = variants.get(tiers[i]);
                if (hasKey(key)) {
                    return key;
                }
            }
            for (int i = preferred.ordinal() - 1; i >= 0; i--) {
                String key = variants.get(tiers[i]);
                if (hasKey(key)) {
                    return key;
                }
            }
        }
        return hasKey(image.getSrcKey()) ? image.getSrcKey() : null;
    }

    /**
     * A copy of {@code image} with its internal {@code srcKey} and whichever
     * {@code variants} it carries (S3 keys) rewritten to presigned URLs. External
     * images and {@code null} are returned unchanged. The stored entity is never
     * mutated.
     *
     * <p>Every tier is optional: an image whose renditions have not been
     * rendered yet — or never will be — hydrates to a presigned original and an
     * empty map, which is exactly what the client's tier walk falls back to.
     * Only keys that are actually stored are signed, so neither a half-filled
     * map nor a still-pending one ever yields a URL to an object that isn't
     * there.
     */
    public AppImage hydrate(AppImage image) {
        if (image == null || image.isExternal()) {
            return image;
        }
        AppImage copy = new AppImage();
        copy.setId(image.getId());
        copy.setExternal(false);
        copy.setSrcKey(hasKey(image.getSrcKey()) ? url(image.getSrcKey()) : image.getSrcKey());
        copy.setExternalSrc(image.getExternalSrc());
        copy.setAltText(image.getAltText());
        copy.setVariants(hydrateVariants(readyVariants(image)));
        copy.setMetadata(image.getMetadata());
        copy.setPlacement(image.getPlacement());
        return copy;
    }

    /**
     * {@code image}'s variants with the tiers that are not stored yet removed —
     * the single filter behind {@link #hydrate} and {@link #displayKey} (and so
     * {@link #displayUrl}, which delegates to it). The stored map is never
     * mutated, and is returned as-is in the overwhelmingly common case that
     * nothing is outstanding.
     */
    private Map<ImageSizeOptions, String> readyVariants(AppImage image) {
        Map<ImageSizeOptions, String> variants = image.getVariants();
        if (variants == null || variants.isEmpty()) {
            return variants;
        }
        Set<ImageSizeOptions> unready = readiness.unreadyTiers(ImageKeys.prefixOf(image.getSrcKey()));
        if (unready.isEmpty()) {
            return variants;
        }
        Map<ImageSizeOptions, String> ready = new EnumMap<>(ImageSizeOptions.class);
        for (Map.Entry<ImageSizeOptions, String> variant : variants.entrySet()) {
            if (!unready.contains(variant.getKey())) {
                ready.put(variant.getKey(), variant.getValue());
            }
        }
        return ready;
    }

    private Map<ImageSizeOptions, String> hydrateVariants(Map<ImageSizeOptions, String> variants) {
        if (variants == null) {
            return null;
        }
        Map<ImageSizeOptions, String> hydrated = new LinkedHashMap<>();
        for (Map.Entry<ImageSizeOptions, String> e : variants.entrySet()) {
            if (hasKey(e.getValue())) {
                hydrated.put(e.getKey(), url(e.getValue()));
            }
        }
        return hydrated;
    }

    private static boolean hasKey(String key) {
        return key != null && !key.isBlank();
    }
}
