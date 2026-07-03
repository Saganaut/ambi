package com.cephadex.ambi.theme;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.Ownership;
import com.cephadex.ambi.common.ViewerPermissions;
import com.cephadex.ambi.common.enums.OwnershipType;
import com.cephadex.ambi.org.OrgRoleResolver;
import com.cephadex.ambi.user.UserService;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * The capabilities {@code ThemeService} stamps onto a theme's response. Themes
 * have no edit/manage split, so {@code canEdit} mirrors {@code canManage}; the
 * underlying predicates live on the {@link Theme} aggregate. Personal and
 * built-in themes resolve without I/O, so the repository and user store stay
 * mocked and untouched here.
 */
class ThemeServiceTest {

    private ThemeService themeService;
    private AmbiPrincipal owner;

    @BeforeEach
    void setUp() {
        themeService = new ThemeService(mock(ThemeRepository.class),
                new OrgRoleResolver(mock(UserService.class)));
        owner = principal("owner-1");
    }

    @Test
    void permissionsForOwnerCanManage() {
        Theme theme = personalTheme("owner-1");

        ViewerPermissions perms = themeService.permissionsFor(theme, owner);

        assertThat(perms.canView()).isTrue();
        assertThat(perms.canEdit()).isTrue();
        assertThat(perms.canManage()).isTrue();
    }

    @Test
    void permissionsForStrangerOnPersonalThemeGrantsNothing() {
        Theme theme = personalTheme("owner-1");

        ViewerPermissions perms = themeService.permissionsFor(theme, principal("intruder"));

        assertThat(perms.canView()).isFalse();
        assertThat(perms.canEdit()).isFalse();
        assertThat(perms.canManage()).isFalse();
    }

    @Test
    void permissionsForBuiltInIsViewOnly() {
        Theme theme = personalTheme("owner-1");
        theme.setBuiltIn(true);

        ViewerPermissions perms = themeService.permissionsFor(theme, principal("anyone"));

        assertThat(perms.canView()).isTrue();
        assertThat(perms.canEdit()).isFalse();
        assertThat(perms.canManage()).isFalse();
    }

    // ── Fixtures ────────────────────────────────────────────────────────────────

    private static AmbiPrincipal principal(String userId) {
        return new AmbiPrincipal(IdentityState.REGISTERED, userId, "pub-" + userId,
                UserLevel.USER, AuthProvider.INTERNAL, null, null, "sid-" + userId);
    }

    private static Theme personalTheme(String ownerId) {
        Theme theme = new Theme();
        theme.setId("theme-1");
        theme.setOwnership(new Ownership(OwnershipType.USER, ownerId));
        return theme;
    }
}
