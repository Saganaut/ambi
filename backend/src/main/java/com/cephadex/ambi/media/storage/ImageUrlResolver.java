package com.cephadex.ambi.media.storage;

import java.net.URI;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.Ticker;

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
 * {@code presignRefreshMargin} of expiry, then re-signed (Caffeine's
 * {@code expireAfterWrite} window is exactly {@code presignTtl - margin}). This
 * keeps repeated reads of the same image returning the identical string, so a
 * client never sees the {@code <img src>} / CSS background change — and thus never
 * reloads the image — when an unrelated edit re-serializes the same {@link AppImage}.
 * The security posture is unchanged: a URL still expires at its signed time; a
 * cached URL is reused but never extended, and is only handed out while at least
 * {@code margin} of its life remains.
 */
@Component
public class ImageUrlResolver {

    private final S3Presigner presigner;
    private final String bucket;
    private final Duration ttl;
    /** key → signed URL, evicted {@code refreshMargin} before the URL expires. */
    private final Cache<String, String> urlCache;

    @Autowired
    public ImageUrlResolver(S3Presigner presigner, S3Properties s3Props, MediaProperties mediaProps) {
        this(presigner, s3Props, mediaProps, Ticker.systemTicker());
    }

    /** Package-private seam: lets a test drive cache expiry with a virtual {@link Ticker}. */
    ImageUrlResolver(S3Presigner presigner, S3Properties s3Props, MediaProperties mediaProps, Ticker ticker) {
        this.presigner = presigner;
        this.bucket = s3Props.getBucket();
        this.ttl = mediaProps.getPresignTtl();
        this.urlCache = Caffeine.newBuilder()
                .maximumSize(mediaProps.getPresignCacheMaxSize())
                .expireAfterWrite(ttl.minus(mediaProps.getPresignRefreshMargin()))
                .ticker(ticker)
                .build();
    }

    /**
     * A short-lived presigned GET URL for the object stored under {@code key},
     * reused from cache while it stays comfortably clear of expiry.
     */
    public String url(String key) {
        return urlCache.get(key, this::sign);
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
     * A copy of {@code image} with its internal {@code srcKey} and {@code variants}
     * (S3 keys) rewritten to presigned URLs. External images and null/empty inputs
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
        copy.setSrcKey(image.getSrcKey() != null ? url(image.getSrcKey()) : null);
        copy.setExternalSrc(image.getExternalSrc());
        copy.setAltText(image.getAltText());
        copy.setVariants(hydrated);
        copy.setMetadata(image.getMetadata());
        copy.setPlacement(image.getPlacement());
        return copy;
    }
}
