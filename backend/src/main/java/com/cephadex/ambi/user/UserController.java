package com.cephadex.ambi.user;

import static com.cephadex.ambi.auth.security.AmbiPrincipals.requireUserId;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.user.dto.UpdatePreferencesRequest;
import com.cephadex.ambi.user.dto.UpdateProfileRequest;
import com.cephadex.ambi.user.dto.UserProfileResponse;

import jakarta.validation.Valid;

/**
 * Self-service account management for the signed-in user. Every route is scoped
 * to {@code /me}: identity comes from the authenticated principal, never the
 * path or body, so a caller can only ever read or edit their own account
 * (auth/README.md Inv 5).
 *
 * <p>These endpoints are registered-user only: they fall under
 * {@code SecurityConfig}'s {@code anyRequest().hasRole("USER")}, so visitors and
 * guests (who hold no {@code ROLE_USER}) are rejected by the filter chain before
 * reaching here. This complements {@code GET /api/auth/me}, which is the public
 * session probe and returns the leaner {@code MeResponse}; the responses here
 * add the owner-only profile fields (timezone, avatar, preferences).
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Returns the caller's full self profile — the read counterpart the settings
     * screen loads before editing. Identity is taken from the principal.
     */
    @GetMapping("/me")
    public UserProfileResponse getMe(@AuthenticationPrincipal AmbiPrincipal principal) {
        return UserProfileResponse.from(userService.requireUser(requireUserId(principal)));
    }

    /**
     * Sparse profile edit: only the fields present in the body are changed
     * (see {@link UpdateProfileRequest}). Returns the updated self profile.
     */
    @PatchMapping("/me")
    public UserProfileResponse updateMe(
            @AuthenticationPrincipal AmbiPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest body) {
        User updated = userService.updateProfile(
                requireUserId(principal), body.displayName(), body.timezone(),
                body.avatar() != null ? body.avatar().toAvatar() : null);
        return UserProfileResponse.from(updated);
    }

    /**
     * Replaces the caller's preferences wholesale (PUT — the form submits the
     * complete desired state). Returns the updated self profile.
     */
    @PutMapping("/me/preferences")
    public UserProfileResponse updatePreferences(
            @AuthenticationPrincipal AmbiPrincipal principal,
            @Valid @RequestBody UpdatePreferencesRequest body) {
        User updated = userService.replacePreferences(
                requireUserId(principal), body.toPreferences());
        return UserProfileResponse.from(updated);
    }
}
