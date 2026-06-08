package com.cephadex.ambi.media;

import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.HandlerMapping;

import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.media.storage.S3StorageService;
import com.cephadex.ambi.media.storage.S3StorageService.StoredObject;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Public read proxy that streams stored image bytes from S3/Garage. Internal
 * {@link AppImage} variant URLs ({@code /api/images/{key}} — minted by
 * {@code ImageUrlResolver}) resolve here, which keeps the bucket private while
 * still letting a plain {@code <img src>} render.
 *
 * <p>Keys contain slashes ({@code gallery/{uuid}/sm.webp}), so the key is taken
 * as the entire path after {@code /api/images/} rather than a single
 * {@code @PathVariable}. This route is {@code permitAll} in {@code SecurityConfig}:
 * keys are opaque UUIDs, and these images end up embedded in publicly playable
 * decks anyway, so the bytes carry no access secret.
 */
@RestController
@RequestMapping("/api/images")
public class ImageController {

    private final S3StorageService storage;

    public ImageController(S3StorageService storage) {
        this.storage = storage;
    }

    @GetMapping("/**")
    public ResponseEntity<byte[]> get(HttpServletRequest request) {
        String key = extractKey(request);
        StoredObject object = storage.get(key);
        if (object == null) {
            throw new NotFoundException("IMAGE_NOT_FOUND", "Image not found");
        }
        MediaType contentType = object.contentType() != null
                ? MediaType.parseMediaType(object.contentType())
                : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.status(HttpStatus.OK)
                // Keys are content-addressed (a new upload mints a new key), so the
                // bytes at a key never change — cache them aggressively.
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .contentType(contentType)
                .body(object.bytes());
    }

    /** The S3 key is everything after the {@code /api/images/} prefix. */
    private String extractKey(HttpServletRequest request) {
        String path = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String prefix = "/api/images/";
        int idx = path.indexOf(prefix);
        String key = idx >= 0 ? path.substring(idx + prefix.length()) : "";
        if (key.isBlank()) {
            throw new NotFoundException("IMAGE_NOT_FOUND", "Image not found");
        }
        return key;
    }
}
