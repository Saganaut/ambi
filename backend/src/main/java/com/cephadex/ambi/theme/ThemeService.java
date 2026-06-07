package com.cephadex.ambi.theme;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.Ownership;
import com.cephadex.ambi.common.ViewerPermissions;
import com.cephadex.ambi.common.enums.OwnershipType;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.common.exception.UnauthorizedException;
import com.cephadex.ambi.org.OrgMembership;
import com.cephadex.ambi.org.enums.OrgRole;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * CRUD for {@link Theme}, gated by the permission rules the aggregate owns
 * ({@code canBeViewedBy} / {@code canBeManagedBy}). This service decides which
 * capability an operation needs, resolves the requester's org role, and turns a
 * denial into a typed {@code ApiException} — mirroring {@code DeckService}.
 */
@Service
public class ThemeService {

    private final ThemeRepository themeRepository;
    private final UserService userService;

    public ThemeService(ThemeRepository themeRepository, UserService userService) {
        this.themeRepository = themeRepository;
        this.userService = userService;
    }

    // ── Create ──────────────────────────────────────────────────────────────

    /**
     * Optimistic creation: the client mints the theme's id. A blank
     * {@code organizationId} creates a personal theme owned by the caller; a
     * non-blank one creates an org-owned theme, which requires the caller to be
     * an OWNER/ADMIN of that org.
     */
    public Theme create(String id, String name, String organizationId, ThemeSpec spec,
            AmbiPrincipal principal) {
        String userId = requireUserId(principal);

        Theme theme = new Theme();
        theme.setId(id);
        theme.setCreatorUserId(userId);
        theme.setSpec(spec);
        if (name != null && !name.isBlank()) {
            theme.setName(name.trim());
        }

        if (organizationId != null && !organizationId.isBlank()) {
            requireOrgManager(organizationId, principal);
            theme.setOwnership(new Ownership(OwnershipType.ORGANIZATION, organizationId));
            theme.setOrganizationId(organizationId);
        } else {
            theme.setOwnership(new Ownership(OwnershipType.USER, userId));
        }

        return themeRepository.save(theme);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    /** Load a theme the requester is allowed to VIEW, else 403/404. */
    public Theme getViewable(String id, AmbiPrincipal principal) {
        Theme theme = load(id);
        if (!theme.canBeViewedBy(userId(principal), level(principal), orgRoleFor(theme, principal))) {
            throw new ForbiddenException("THEME_VIEW_FORBIDDEN",
                    "You do not have access to this theme");
        }
        return theme;
    }

    // ── Update ──────────────────────────────────────────────────────────────

    /** Replace a theme's editable fields (MANAGE). */
    public Theme update(String id, String name, ThemeSpec spec, AmbiPrincipal principal) {
        Theme theme = load(id);
        requireManage(theme, principal);
        theme.setName(name == null || name.isBlank() ? "Untitled Theme" : name.trim());
        theme.setSpec(spec);
        return themeRepository.save(theme);
    }

    // ── Delete ──────────────────────────────────────────────────────────────

    /** Delete a theme (MANAGE). */
    public void delete(String id, AmbiPrincipal principal) {
        Theme theme = load(id);
        requireManage(theme, principal);
        themeRepository.delete(theme);
    }

    // ── Listing ───────────────────────────────────────────────────────────────

    /** Themes personally owned by a user. */
    public List<Theme> listOwnedByUser(String userId) {
        return themeRepository.findByOwnershipTypeAndOwnershipOwnerId(OwnershipType.USER, userId);
    }

    /** Themes owned by an org — requires the requester to be a member of it. */
    public List<Theme> listForOrg(String orgId, AmbiPrincipal principal) {
        if (!isPlatformAdmin(principal) && orgRoleFor(orgId, userId(principal)) == null) {
            throw new ForbiddenException("THEME_VIEW_FORBIDDEN",
                    "You are not a member of this organization");
        }
        return themeRepository.findByOrganizationId(orgId);
    }

    /** App-provided preset themes, available to everyone. */
    public List<Theme> listBuiltIn() {
        return themeRepository.findByBuiltInTrue();
    }

    /**
     * The requesting principal's capabilities over this theme. Themes have no
     * edit/manage split, so {@code canEdit} mirrors {@code canManage}. The
     * controller stamps the result onto the theme's response. Personal and
     * built-in themes resolve without I/O; org-owned themes cost one user lookup
     * to read the requester's org role.
     */
    public ViewerPermissions permissionsFor(Theme theme, AmbiPrincipal principal) {
        String userId = userId(principal);
        UserLevel level = level(principal);
        OrgRole orgRole = orgRoleFor(theme, principal);
        boolean canManage = theme.canBeManagedBy(userId, level, orgRole);
        return new ViewerPermissions(
                theme.canBeViewedBy(userId, level, orgRole),
                canManage,
                canManage);
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private Theme load(String id) {
        return themeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("THEME_NOT_FOUND", "Theme not found"));
    }

    private void requireManage(Theme theme, AmbiPrincipal principal) {
        if (!theme.canBeManagedBy(userId(principal), level(principal), orgRoleFor(theme, principal))) {
            throw new ForbiddenException("THEME_MANAGE_FORBIDDEN",
                    "You do not have permission to manage this theme");
        }
    }

    /** Caller must be an OWNER/ADMIN of the given org to create a theme for it. */
    private void requireOrgManager(String orgId, AmbiPrincipal principal) {
        if (isPlatformAdmin(principal)) {
            return;
        }
        OrgRole role = orgRoleFor(orgId, userId(principal));
        if (role != OrgRole.OWNER && role != OrgRole.ADMIN) {
            throw new ForbiddenException("THEME_MANAGE_FORBIDDEN",
                    "You do not have permission to create themes for this organization");
        }
    }

    /**
     * The requester's role in this theme's owning org, or null. Skips I/O for
     * personal themes.
     */
    private OrgRole orgRoleFor(Theme theme, AmbiPrincipal principal) {
        if (theme == null || !theme.isOrgOwned()) {
            return null;
        }
        return orgRoleFor(theme.getOrganizationId(), userId(principal));
    }

    private OrgRole orgRoleFor(String orgId, String userId) {
        if (orgId == null || userId == null) {
            return null;
        }
        Optional<User> user = userService.findById(userId);
        if (user.isEmpty() || user.get().getOrgRoles() == null) {
            return null;
        }
        for (OrgMembership membership : user.get().getOrgRoles()) {
            if (orgId.equals(membership.orgId())) {
                return membership.orgRole();
            }
        }
        return null;
    }

    private static String userId(AmbiPrincipal principal) {
        return principal == null ? null : principal.userId();
    }

    private static UserLevel level(AmbiPrincipal principal) {
        return principal == null ? null : principal.userLevel();
    }

    private static boolean isPlatformAdmin(AmbiPrincipal principal) {
        UserLevel level = level(principal);
        return level != null && level.hasAccessTo(UserLevel.ADMIN);
    }

    private static String requireUserId(AmbiPrincipal principal) {
        String id = userId(principal);
        if (id == null) {
            throw new UnauthorizedException("AUTH_REQUIRED", "Sign in to continue");
        }
        return id;
    }
}
