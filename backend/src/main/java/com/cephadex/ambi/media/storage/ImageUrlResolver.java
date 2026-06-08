package com.cephadex.ambi.media.storage;

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
 * {@code image.ts} documents: stored {@code variants} hold keys; the client
 * receives URLs.
 *
 * <p>Those URLs are <em>presigned</em> GET URLs (SigV4) with a short TTL, so the
 * bucket stays private and access is time-limited. They expire, so they are
 * deliberately never persisted: every read re-signs (see the central
 * {@code AppImageSerializer}), and a {@code srcKey} round-trips raw so the
 * inbound deserializer can rebuild canonical keys for a copied image. External
 * images already carry a renderable {@code externalSrc} and pass through.
 */
@Component
public class ImageUrlResolver {

    private final S3Presigner presigner;
    private final String bucket;
    private final java.time.Duration ttl;

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
     * A copy of {@code image} with its internal {@code variants} (S3 keys)
     * rewritten to presigned URLs. External images and null/empty inputs are
     * returned unchanged. {@code srcKey} is left raw so it can round-trip back as
     * the reconstruction anchor. The stored entity is never mutated.
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
