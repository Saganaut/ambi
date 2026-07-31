package com.cephadex.ambi.media;

import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.media.storage.OpaqueImageUrls;
import com.cephadex.ambi.media.storage.S3StorageService;
import com.cephadex.ambi.media.storage.S3StorageService.StoredObject;

import io.swagger.v3.oas.annotations.Hidden;

/**
 * Same-origin proxy that streams a stored image whose <em>S3 key must not
 * travel</em>, addressed by the signed token {@link OpaqueImageUrls} mints
 * rather than by anything the client can read.
 *
 * <p>It exists for the live-session follow-up boards: a
 * {@code SPOT_THE_ANSWER} round mixes the authored answer in among participant
 * submissions, and the presigned URLs the rest of the app serves would name the
 * key namespace each candidate came from ({@code gallery/…} vs
 * {@code drawing/…}) — the seeded card identified from devtools. Every candidate
 * image on such a board is instead served from this one route, so the URLs are
 * indistinguishable.
 *
 * <p>The token <em>is</em> the authorization for the object behind it — it is
 * unguessable, HMAC-signed and expires — but the route still sits behind the
 * live-session guest floor in {@code SecurityConfig}, so an anonymous visitor
 * holding a leaked token gets nothing.
 *
 * <p>Intentionally {@link Hidden} from OpenAPI for the same reason as
 * {@link RemoteImageController} and the gallery file read: it returns raw image
 * bytes, not a typed JSON resource, so a generated RTK Query hook could only
 * mis-parse it. Clients render it straight from an {@code <img src>} — the URL
 * arrives ready to use on the round's payload.
 */
@RestController
@RequestMapping("/api/media")
public class OpaqueImageController {

    /**
     * How long a client may reuse the bytes it fetched. A token is stable for
     * its whole life and the object under a content-addressed key never changes,
     * so a hit cannot be stale; {@code private} because the response is
     * authorized per caller and must never land in a shared cache.
     */
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final OpaqueImageUrls opaqueImageUrls;
    private final S3StorageService storage;

    public OpaqueImageController(OpaqueImageUrls opaqueImageUrls, S3StorageService storage) {
        this.opaqueImageUrls = opaqueImageUrls;
        this.storage = storage;
    }

    /**
     * Stream the object the token stands for. A malformed, tampered or expired
     * token is a {@code 400 VALIDATION_FAILED} (raised by
     * {@link OpaqueImageUrls#keyFrom}); a valid token whose object is gone is the
     * {@code 404 GALLERY_IMAGE_NOT_FOUND} the gallery's own byte read uses for
     * "there is no file here".
     */
    @Hidden
    @GetMapping("/opaque-image")
    public ResponseEntity<byte[]> opaqueImage(@RequestParam("t") String token) {
        StoredObject stored = storage.get(opaqueImageUrls.keyFrom(token));
        if (stored == null) {
            throw new NotFoundException("GALLERY_IMAGE_NOT_FOUND", "Image file not found");
        }
        return ResponseEntity.ok()
                .contentType(contentTypeOf(stored))
                .cacheControl(CacheControl.maxAge(CACHE_TTL).cachePrivate())
                .body(stored.bytes());
    }

    /** The stored content type, falling back to a generic type when absent. */
    private static MediaType contentTypeOf(StoredObject stored) {
        String contentType = stored.contentType();
        return StringUtils.hasText(contentType)
                ? MediaType.parseMediaType(contentType)
                : MediaType.APPLICATION_OCTET_STREAM;
    }
}
