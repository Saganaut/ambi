package com.cephadex.ambi.media.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

/**
 * S3 connection settings (prefix {@code ambi.s3}). Bound from the {@code S3_*}
 * env vars sourced by {@code scripts/ambi.sh}; the defaults target the repo-root
 * {@code compose.yaml} Garage container (an S3-compatible store).
 *
 * <p>Garage — like MinIO — serves a single endpoint and requires
 * <em>path-style</em> addressing ({@code endpoint/bucket/key}) rather than the
 * virtual-host style AWS uses ({@code bucket.s3.amazonaws.com/key}), so
 * {@link #pathStyleAccess} defaults to {@code true}. Follows the
 * {@code AuthProperties}/{@code DeckDefaultsProperties} convention: a mutable
 * Lombok bean, auto-registered via {@code @ConfigurationPropertiesScan}.
 */
@Data
@ConfigurationProperties(prefix = "ambi.s3")
public class S3Properties {

    /** S3 API endpoint (Garage in dev; unset/AWS-default in prod). */
    private String endpoint;

    /** Region label. Garage uses a fixed {@code "garage"} region. */
    private String region = "garage";

    /** Bucket every gallery/avatar object lands in. */
    private String bucket;

    /** Access key id. */
    private String accessKey;

    /** Secret access key. */
    private String secretKey;

    /** Path-style addressing — required by Garage/MinIO, ignored by real AWS. */
    private boolean pathStyleAccess = true;
}
