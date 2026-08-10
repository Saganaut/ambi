package com.cephadex.ambi.media.variants;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.cephadex.ambi.media.variants.dto.ImageVariantsReadyRequest;

import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;

/**
 * The rendition worker's way back in: it reports which tiers it has stored, and
 * {@link ImageVariantCompletionService} makes them visible to readers.
 *
 * <p>Two deliberate departures from the house controller shape. The base path is
 * {@code /api/internal/**} rather than {@code /api/<feature-plural>} so
 * {@code SecurityConfig} can permit (and CSRF-exempt) every machine-to-machine
 * route with one matcher instead of accumulating exceptions inside the user API.
 * And it is {@code @Hidden}: the client generator would otherwise mint a browser
 * hook for a route no browser may call.
 *
 * <p>Authorization is the shared secret in {@code X-Ambi-Worker-Secret} alone
 * ({@link WorkerCallbackAuthenticator}) — there is no user session behind a
 * background worker.
 */
@RestController
@RequestMapping("/api/internal/image-variants")
@Hidden
public class InternalImageVariantController {

    /** Header the worker presents its shared secret in. */
    public static final String WORKER_SECRET_HEADER = "X-Ambi-Worker-Secret";

    private final WorkerCallbackAuthenticator authenticator;
    private final ImageVariantCompletionService completions;

    public InternalImageVariantController(WorkerCallbackAuthenticator authenticator,
            ImageVariantCompletionService completions) {
        this.authenticator = authenticator;
        this.completions = completions;
    }

    /** Mark the reported tiers ready. {@code 204} even when the key root is unknown. */
    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void report(
            @RequestHeader(value = WORKER_SECRET_HEADER, required = false) String workerSecret,
            @Valid @RequestBody ImageVariantsReadyRequest body) {
        authenticator.require(workerSecret);
        completions.apply(body);
    }
}
