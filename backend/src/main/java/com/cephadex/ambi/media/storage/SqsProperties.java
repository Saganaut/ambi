package com.cephadex.ambi.media.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

/**
 * SQS connection settings (prefix {@code ambi.sqs}). Bound from the
 * {@code SQS_*} env vars sourced by {@code scripts/ambi.sh}; the defaults target
 * the repo-root {@code compose.yaml} ElasticMQ container, the dev stand-in for
 * SQS behind the async image-variant pipeline.
 *
 * <p>Deliberate mirror of {@link S3Properties} — same shape, same env-var
 * convention, same "unset endpoint means real AWS" rule (see {@link SqsConfig}).
 * The queue URL is configured rather than looked up: both this producer and the
 * Python worker address a fixed URL, so neither pays a {@code GetQueueUrl} round
 * trip nor depends on the account-id path segment ElasticMQ synthesizes.
 */
@Data
@ConfigurationProperties(prefix = "ambi.sqs")
public class SqsProperties {

    /** SQS API endpoint (ElasticMQ in dev; unset/AWS-default in prod). */
    private String endpoint;

    /** Region label. ElasticMQ ignores it but the SDK requires one. */
    private String region = "elasticmq";

    /** Access key id. Blank in prod, where the instance's IAM role applies. */
    private String accessKey;

    /** Secret access key. Blank in prod, for the same reason. */
    private String secretKey;

    /** The queue image-variant render jobs are published to. */
    private String imageVariantQueueUrl;
}
