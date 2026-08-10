package com.cephadex.ambi.media.variants;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.media.variants.dto.ImageVariantsReadyRequest;

/**
 * Applies a worker's completion report to the pending row: union the tiers,
 * delete the row once nothing is outstanding, then drop the cached readiness so
 * this instance stops filtering the finished tiers out.
 *
 * <p>Every path is idempotent, because SQS redelivery guarantees the same report
 * can arrive twice. A report for a key root with no row — a redelivery after the
 * row was already completed and deleted, or a stale queue message for a deleted
 * image — is a silent no-op, which is the same outcome as the row having been
 * completed by the first delivery.
 */
@Service
public class ImageVariantCompletionService {

    private static final Logger log = LoggerFactory.getLogger(ImageVariantCompletionService.class);

    private final PendingImageVariantsRepository repository;
    private final ImageVariantReadiness readiness;

    public ImageVariantCompletionService(PendingImageVariantsRepository repository,
            ImageVariantReadiness readiness) {
        this.repository = repository;
        this.readiness = readiness;
    }

    /** Record {@code report} against its row. */
    public void apply(ImageVariantsReadyRequest report) {
        String keyRoot = report.keyRoot();
        boolean complete = repository.recordReady(keyRoot, report.readyTiers(), report.terminal());
        if (complete) {
            repository.deleteById(keyRoot);
        }
        // Unconditional: a partial report has made tiers visible, and for an
        // unknown key root re-reading only reconfirms the (permanent) absence.
        readiness.invalidate(keyRoot);
        log.debug("Image variants reported for {}: tiers={} terminal={} attempt={} complete={}",
                keyRoot, report.readyTiers(), report.terminal(), report.attempt(), complete);
    }
}
