package com.cephadex.ambi.media.variants;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.media.storage.SqsProperties;

import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.json.JsonMapper;

/**
 * Publishes rendition jobs onto SQS — ElasticMQ in dev, the managed service in
 * production. Displaces {@link LoggingImageVariantJobPublisher} wherever a queue
 * URL is configured.
 *
 * <p>The body is the JSON projection of {@link ImageVariantJobMessage}, whose
 * component names <em>are</em> the wire contract; the mapper is a local Jackson 3
 * one rather than the web stack's so a future change to HTTP serialization can't
 * silently rewrite what the worker parses. {@code requestedAt} is pinned to
 * ISO-8601 text for the same reason.
 *
 * <p>Nothing is caught here. A send that fails must reach
 * {@link ImageVariantRequests}, which owns the decision that a lost job is a
 * warning rather than a failed upload — swallowing it twice would leave that
 * seam unable to tell a published job from a dropped one.
 *
 * <p>{@code @Primary} is the belt to the fallback's braces:
 * {@code @ConditionalOnMissingBean} only backs a scanned component off when the
 * bean it looks for is already registered, and the order two components are
 * scanned in is not contractual. If this one happens to be scanned second the
 * fallback stays registered, and without a primary the injection point would be
 * ambiguous rather than merely redundant.
 */
@Component
@Primary
public class SqsImageVariantJobPublisher implements ImageVariantJobPublisher {

    private static final Logger log = LoggerFactory.getLogger(SqsImageVariantJobPublisher.class);

    private final JsonMapper mapper = JsonMapper.builder()
            .disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)
            .build();

    private final SqsClient sqs;
    private final String queueUrl;

    public SqsImageVariantJobPublisher(SqsClient sqs, SqsProperties props) {
        this.sqs = sqs;
        this.queueUrl = props.getImageVariantQueueUrl();
    }

    @Override
    public void publish(ImageVariantJobMessage job) {
        sqs.sendMessage(SendMessageRequest.builder()
                .queueUrl(queueUrl)
                .messageBody(mapper.writeValueAsString(job))
                .build());
        log.debug("Enqueued the image-variant job for {} ({} tiers)", job.keyRoot(), job.tiers().size());
    }
}
