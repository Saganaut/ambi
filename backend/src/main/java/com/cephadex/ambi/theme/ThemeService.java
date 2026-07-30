package com.cephadex.ambi.theme;

import static com.cephadex.ambi.auth.security.AmbiPrincipals.isPlatformAdmin;
import static com.cephadex.ambi.auth.security.AmbiPrincipals.level;
import static com.cephadex.ambi.auth.security.AmbiPrincipals.requireUserId;
import static com.cephadex.ambi.auth.security.AmbiPrincipals.userId;

import java.util.List;

import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.Ownership;
import com.cephadex.ambi.common.ViewerPermissions;
import com.cephadex.ambi.common.enums.OwnershipType;
import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.org.OrgRoleResolver;
import com.cephadex.ambi.org.enums.OrgRole;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * CRUD for {@link Theme}, gated by the permission rules the aggregate owns
 * ({@code canBeViewedBy} / {@code canBeManagedBy}). This service decides which
 * capability an operation needs, resolves the requester's org role via
 * {@link OrgRoleResolver}, and turns a denial into a typed {@code ApiException} —
 * mirroring {@code DeckService}.
 */
@Service
public class ThemeService {

    private final ThemeRepository themeRepository;
    private final OrgRoleResolver orgRoles;

    public ThemeService(ThemeRepository themeRepository, OrgRoleResolver orgRoles) {
        this.themeRepository = themeRepository;
        this.orgRoles = orgRoles;
    }

    // ── Create ──────────────────────────────────────────────────────────────

    /**
     * Optimistic creation: the client mints the theme's id. A blank
     * {@code organizationId} creates a personal theme owned by the caller; a
     * non-blank one creates an org-owned theme, which requires the caller to be
     * an OWNER/ADMIN of that org.
     *
     * @throws ConflictException if {@code id} is one of the {@link Themes}
     *                           reserved ids — those name client-side defaults
     *                           and must stay unresolvable in the collection, so
     *                           the conflict is raised ahead of the insert
     *                           rather than left to the {@code _id} index (which
     *                           the controller swallows as an idempotent resend)
     */
    public Theme create(String id, String name, String organizationId, ThemeSpec spec,
            AmbiPrincipal principal) {
        String userId = requireUserId(principal);
        if (Themes.isReservedId(id)) {
            throw new ConflictException("THEME_ID_RESERVED",
                    "This theme id is reserved for a built-in theme");
        }

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
        if (!theme.canBeViewedBy(userId(principal), level(principal), orgRoles.roleFor(theme, principal))) {
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
        if (!isPlatformAdmin(principal) && orgRoles.roleFor(orgId, userId(principal)) == null) {
            throw new ForbiddenException("THEME_VIEW_FORBIDDEN",
                    "You are not a member of this organization");
        }
        return themeRepository.findByOrganizationId(orgId);
    }

    /**
     * App-provided preset themes, available to everyone. The two brand defaults
     * ("Ambi Light" / "Ambi Dark") are intentionally absent — they are
     * client-side themes resolved from the stylesheet, not stored rows; see
     * {@link Themes}.
     */
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
        OrgRole orgRole = orgRoles.roleFor(theme, principal);
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
        if (!theme.canBeManagedBy(userId(principal), level(principal), orgRoles.roleFor(theme, principal))) {
            throw new ForbiddenException("THEME_MANAGE_FORBIDDEN",
                    "You do not have permission to manage this theme");
        }
    }

    /** Caller must be an OWNER/ADMIN of the given org to create a theme for it. */
    private void requireOrgManager(String orgId, AmbiPrincipal principal) {
        if (isPlatformAdmin(principal)) {
            return;
        }
        OrgRole role = orgRoles.roleFor(orgId, userId(principal));
        if (role != OrgRole.OWNER && role != OrgRole.ADMIN) {
            throw new ForbiddenException("THEME_MANAGE_FORBIDDEN",
                    "You do not have permission to create themes for this organization");
        }
    }
}
