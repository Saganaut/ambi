package com.cephadex.ambi.media;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cephadex.ambi.media.storage.RemoteImageService;
import com.cephadex.ambi.media.storage.RemoteImageService.RemoteImage;

import io.swagger.v3.oas.annotations.Hidden;

/**
 * Same-origin proxy that streams a user-supplied remote image back to the
 * browser, so the client can load a pasted URL into a canvas for cropping
 * without CORS-taint. {@link RemoteImageService} owns the SSRF guards.
 *
 * <p>Intentionally {@link Hidden} from OpenAPI: it returns raw image bytes, not
 * a typed JSON resource, so it has no place in the generated RTK Query client —
 * the frontend calls it with a plain authenticated {@code fetch} that reads the
 * response as a {@code Blob}. (Exposing it would only add an unusable generated
 * hook that JSON-parses binary.) Auth is enforced by the global
 * {@code anyRequest().hasRole("USER")} rule, the same as the gallery routes.
 */
@RestController
@RequestMapping("/api/media")
public class RemoteImageController {

    private final RemoteImageService remoteImageService;

    public RemoteImageController(RemoteImageService remoteImageService) {
        this.remoteImageService = remoteImageService;
    }

    /** Fetch {@code url} server-side and return its bytes with the source's type. */
    @Hidden
    @GetMapping("/remote-image")
    public ResponseEntity<byte[]> remoteImage(@RequestParam String url) {
        RemoteImage image = remoteImageService.fetch(url);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .body(image.bytes());
    }
}
