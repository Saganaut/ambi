package com.cephadex.ambi.media.variants;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

/**
 * The fallback {@link ImageVariantJobPublisher}: logs the job and drops it.
 *
 * <p>It exists so the readiness model can ship — and be exercised end to end —
 * before a real queue does. With it in place an upload opens its pending row,
 * the row is never completed, and every image serves its untouched original:
 * degraded, but correct. Backs off as soon as a queue-backed publisher is
 * registered.
 *
 * <p>{@code ignored} is load-bearing: without it the condition counts this very
 * class as an existing {@link ImageVariantJobPublisher} and excludes itself,
 * leaving nothing to inject.
 */
@Component
@ConditionalOnMissingBean(value = ImageVariantJobPublisher.class, ignored = LoggingImageVariantJobPublisher.class)
public class LoggingImageVariantJobPublisher implements ImageVariantJobPublisher {

    private static final Logger log = LoggerFactory.getLogger(LoggingImageVariantJobPublisher.class);

    @Override
    public void publish(ImageVariantJobMessage job) {
        log.info("No image-variant queue configured — dropping job for {} ({} tiers); "
                + "the image will serve its original until one is", job.keyRoot(), job.tiers().size());
    }
}
