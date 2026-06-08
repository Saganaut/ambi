package com.cephadex.ambi.media.storage;

import java.net.URI;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;

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
 * bucket stays private and access is time-limited. They expire, so they are
 * deliberately never persisted: every read re-signs (see {@code AppImageSerializer}),
 * and on write {@link #keyFromUrl(String)} recovers the raw key from a presigned
 * URL the client echoes back (see {@code AppImageDeserializer}). External images
 * already carry a renderable {@code externalSrc} and pass through.
 */
@Component
public class ImageUrlResolver {

    private final S3Presigner presigner;
    private final String bucket;
    private final Duration ttl;

    public ImageUrlResolver(S3Presigner presigner, S3Properties s3Props, MediaProperties mediaProps) {
        this.presigner = presigner;
        this.bucket = s3Props.getBucket();
        this.ttl = mediaProps.getPresignTtl();
    }

    /** A short-lived presigned GET URL for the object stored under {@code key}. */
    public String url(String key) {
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
        return copy;
    }
}
