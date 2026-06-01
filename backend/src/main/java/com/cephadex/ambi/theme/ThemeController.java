package com.cephadex.ambi.theme;

import java.util.List;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.UnauthorizedException;
import com.cephadex.ambi.theme.dto.CreateThemeRequest;
import com.cephadex.ambi.theme.dto.ThemeResponse;
import com.cephadex.ambi.theme.dto.UpdateThemeRequest;

import jakarta.validation.Valid;

/**
 * HTTP surface for the {@link Theme} aggregate. Every route delegates straight
 * to {@link ThemeService}, which owns the permission rules; the controller only
 * resolves the caller's {@link AmbiPrincipal}, maps DTOs, and lets the service
 * throw the typed {@code ApiException}s the global handler turns into RFC 9457
 * problem responses. Themes are keyed by a high-entropy id, so a forbidden
 * access is an honest 403, never a masked 404.
 */
@RestController
@RequestMapping("/api/themes")
public class ThemeController {

    private final ThemeService themeService;

    public ThemeController(ThemeService themeService) {
        this.themeService = themeService;
    }

    // ── Theme CRUD ────────────────────────────────────────────────────────────

    /**
     * Optimistic create: the client mints the theme's UUID and PUTs the full
     * desired state. Idempotent, as PUT should be — a resend of the same id hits
     * the {@code _id} unique index ({@code create} always inserts, never upserts),
     * so we swallow the duplicate and return the existing theme. The VIEW check
     * still applies, so reusing an id owned by someone else yields the usual
     * 403/404 rather than a peek.
     */
    @PutMapping("/{id}")
    public ThemeResponse create(
            @PathVariable String id,
            @Valid @RequestBody CreateThemeRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        try {
            return ThemeResponse.from(themeService.create(
                    id, body.name(), body.organizationId(), body.spec(), principal));
        } catch (DuplicateKeyException alreadyExists) {
            return ThemeResponse.from(themeService.getViewable(id, principal));
        }
    }

    /** Read a theme (VIEW). */
    @GetMapping("/{id}")
    public ThemeResponse getTheme(
            @PathVariable String id,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return ThemeResponse.from(themeService.getViewable(id, principal));
    }

    /** Replace a theme's editable fields (MANAGE). */
    @PatchMapping("/{id}")
    public ThemeResponse updateTheme(
            @PathVariable String id,
            @Valid @RequestBody UpdateThemeRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return ThemeResponse.from(themeService.update(id, body.name(), body.spec(), principal));
    }

    /** Delete a theme (MANAGE). */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTheme(
            @PathVariable String id,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        themeService.delete(id, principal);
    }

    // ── Listings ────────────────────────────────────────────────────────────────

    /** The caller's personal themes. Identity comes from the principal, never input. */
    @GetMapping("/mine")
    public List<ThemeResponse> listMine(@AuthenticationPrincipal AmbiPrincipal principal) {
        return themeService.listOwnedByUser(requireUserId(principal)).stream()
                .map(ThemeResponse::from)
                .toList();
    }

    /** App-provided preset themes. Available to everyone. */
    @GetMapping("/built-in")
    public List<ThemeResponse> listBuiltIn() {
        return themeService.listBuiltIn().stream()
                .map(ThemeResponse::from)
                .toList();
    }

    /** Themes owned by an org — requires the caller to be a member (VIEW). */
    @GetMapping(params = "orgId")
    public List<ThemeResponse> listForOrg(
            @RequestParam String orgId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return themeService.listForOrg(orgId, principal).stream()
                .map(ThemeResponse::from)
                .toList();
    }

    /**
     * Defence-in-depth: the filter chain already guarantees a registered principal
     * on {@code /mine}, but a backed principal always carries a {@code userId}, so
     * a null is a contract violation rather than an expected anonymous case.
     */
    private String requireUserId(AmbiPrincipal principal) {
        if (principal == null || principal.userId() == null) {
            throw new UnauthorizedException("NOT_AUTHENTICATED", "Sign-in is required.");
        }
        return principal.userId();
    }
}
