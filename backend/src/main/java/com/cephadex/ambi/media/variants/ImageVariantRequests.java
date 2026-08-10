package com.cephadex.ambi.media.variants;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.storage.MediaProperties;
import com.cephadex.ambi.media.storage.S3Properties;

/**
 * The write side of the readiness model: opens a pending row, and enqueues the
 * job that eventually closes it.
 *
 * <p>The two halves are separate calls because their ordering around the S3 PUT
 * is load-bearing. The row must exist <em>before</em> the original can be
 * observed (or a reader would be handed renditions that do not exist), and the
 * job must be published <em>after</em> it (or the worker could dequeue before
 * there is anything to render). Only failing to open the row is fatal to the
 * caller: an unpublished job leaves the image serving its original until a
 * repair sweep re-publishes.
 *
 * <p>Callers: {@code ImageIngestService} for a fresh upload, and
 * {@code DeckImageLifecycleService} when an adoption's variant copies come up
 * short.
 */
@Service
public class ImageVariantRequests {

    private static final Logger log = LoggerFactory.getLogger(ImageVariantRequests.class);

    private final PendingImageVariantsRepository repository;
    private final ImageVariantJobPublisher publisher;
    private final MediaProperties props;
    private final String bucket;
    private final Clock clock;

    @Autowired
    public ImageVariantRequests(PendingImageVariantsRepository repository, ImageVariantJobPublisher publisher,
            MediaProperties props, S3Properties s3Props) {
        this(repository, publisher, props, s3Props, Clock.systemUTC());
    }

    /** Package-private seam: lets a test pin the job's {@code requestedAt}. */
    ImageVariantRequests(PendingImageVariantsRepository repository, ImageVariantJobPublisher publisher,
            MediaProperties props, S3Properties s3Props, Clock clock) {
        this.repository = repository;
        this.publisher = publisher;
        this.props = props;
        this.bucket = s3Props.getBucket();
        this.clock = clock;
    }

    /**
     * Declare {@code tiers} of {@code keyRoot} missing. Idempotent, and never
     * gated on {@code ambi.media.variants.enabled} — turning the pipeline off
     * must degrade an image to its original, never make an absent rendition look
     * present.
     */
    public void open(String keyRoot, Set<ImageSizeOptions> tiers, String contentType) {
        repository.openPending(keyRoot, tiers, contentType);
    }

    /**
     * Enqueue the render. Swallows every failure — by this point the caller's
     * write has already succeeded and the row is open, so the only honest
     * outcome is a warning.
     */
    public void publish(String keyRoot, String srcKey, Set<ImageSizeOptions> tiers, String contentType) {
        if (!props.getVariants().isEnabled()) {
            return;
        }
        try {
            publisher.publish(new ImageVariantJobMessage(ImageVariantJobMessage.VERSION, keyRoot, srcKey,
                    bucket, contentType, tierRequests(tiers), clock.instant()));
        } catch (RuntimeException e) {
            log.warn("Could not enqueue the image-variant job for {} — it stays pending until a repair sweep "
                    + "re-publishes it", keyRoot, e);
        }
    }

    /** The requested tiers in enum order, each with its configured bounding box. */
    private List<ImageVariantJobMessage.TierRequest> tierRequests(Set<ImageSizeOptions> tiers) {
        Map<ImageSizeOptions, Integer> bounds = props.getVariants().getTierBounds();
        List<ImageVariantJobMessage.TierRequest> requests = new ArrayList<>();
        for (ImageSizeOptions tier : ImageSizeOptions.values()) {
            Integer bound = bounds.get(tier);
            if (tiers.contains(tier) && bound != null) {
                requests.add(new ImageVariantJobMessage.TierRequest(tier, bound));
            }
        }
        return requests;
    }
}
