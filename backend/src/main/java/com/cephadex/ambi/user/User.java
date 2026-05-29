package com.cephadex.ambi.user;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.auth.AuthInfo;
import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.billing.Membership;
import com.cephadex.ambi.common.Auditable;
import com.cephadex.ambi.org.OrgMembership;
import com.cephadex.ambi.user.enums.UserLevel;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(exclude = { "auth" })
@Document(collection = "users")
public class User extends Auditable {

    // id is inherited from BaseDocument (@Id String id) — do not redeclare.

    // Uniqueness for public_id / username / email_address and the identity pair
    // (auth.*) is enforced by DB indexes created in UserIndexInitializer — NOT
    // by @Indexed here, since auto-index-creation is off. That runner is the
    // single source of truth (email/identity indexes are partial so guests,
    // which have neither, are exempt).
    @Field("public_id")
    private String publicId;

    @Field("username")
    private String username;

    @Field("email_address")
    private String emailAddress;

    @Field("display_name")
    private String displayName;

    @Field("email_verified_at")
    private Instant emailVerifiedAt;

    @Field("last_login")
    private Instant lastLogin;

    /**
     * Mongo TTL reaper: when set, Mongo's background TTL monitor deletes the
     * document once this instant passes. Only populated for guest accounts;
     * cleared on guest→registered upgrade so a real account is never reaped.
     * The backing TTL index ({@code expireAfterSeconds = 0}) is created in
     * UserIndexInitializer, not via {@code @Indexed}. See auth/README.md and
     * {@code AuthProperties.Guest}.
     */
    @Field("guest_expires_at")
    private Instant guestExpiresAt;

    @Field("timezone")
    private String timezone;

    @Field("auth")
    private AuthInfo auth;

    @Field("avatar")
    private Avatar avatar;

    @Field("preferences")
    private UserPreferences preferences;

    @Field("membership")
    private Membership membership;

    @Field("user_level")
    private UserLevel userLevel = UserLevel.USER;

    @Field("is_closed")
    private boolean closed;

    @Field("closed_at")
    private Instant closedAt;

    @Field("closed_reason")
    private String closedReason;

    @Field("org_roles")
    private List<OrgMembership> orgRoles;

    // ---------------------------------------------------------------------
    // Factories — construct a User in a valid initial state. The service
    // owns persistence and DB-uniqueness reconciliation; it never reaches
    // in field-by-field to build one.
    // ---------------------------------------------------------------------

    /**
     * A fresh {@code GUEST}: internal auth, no email, an auto-generated
     * username and {@code publicId}. {@code guestExpiresAt} arms the Mongo TTL
     * reaper — the caller resolves it from config and passes it in so the
     * aggregate stays free of {@code AuthProperties}. Each call mints a new
     * username, so {@code UserService.createGuest} can simply re-invoke this on
     * a duplicate-key collision (Inv 9: the DB index is the uniqueness
     * authority).
     */
    public static User newGuest(Instant now, Instant guestExpiresAt) {
        AuthInfo auth = new AuthInfo();
        auth.setAuthProvider(AuthProvider.INTERNAL);
        auth.setExternalProviderId(null);

        User guest = new User();
        guest.publicId = UUID.randomUUID().toString();
        guest.username = "guest-" + shortId();
        guest.displayName = "Guest";
        guest.userLevel = UserLevel.GUEST;
        guest.auth = auth;
        guest.membership = new Membership();
        guest.lastLogin = now;
        guest.guestExpiresAt = guestExpiresAt;
        return guest;
    }

    /**
     * A freshly registered account. Identity ({@code provider},
     * {@code externalProviderId}, {@code email}) originates from the
     * authenticated session principal, never request input (auth/README.md
     * Inv 5). No {@code guestExpiresAt} — this is a real account from the start.
     */
    public static User newRegistered(AuthProvider provider, String externalProviderId,
            String email, String username, String displayName, Instant now) {
        AuthInfo auth = new AuthInfo();
        auth.setAuthProvider(provider);
        auth.setExternalProviderId(externalProviderId);

        User user = new User();
        user.publicId = UUID.randomUUID().toString();
        user.username = username;
        user.displayName = displayName != null && !displayName.isBlank() ? displayName : username;
        user.emailAddress = email;
        user.emailVerifiedAt = now;
        user.userLevel = UserLevel.USER;
        user.auth = auth;
        user.membership = new Membership();
        user.lastLogin = now;
        return user;
    }

    // ---------------------------------------------------------------------
    // Behavior — state transitions that enforce the aggregate's invariants.
    // ---------------------------------------------------------------------

    /**
     * Upgrades this guest into a registered account in place (auth/README.md
     * Inv 1): the {@code _id} and existing {@code username} are preserved
     * (guest squat accepted — Inv 9), the external identity, email and
     * {@code userLevel=USER} are written, and — critically — the TTL reaper
     * field is cleared so a now-real account is never deleted. Reopens the
     * account if it was closed. The guard makes "only a guest may upgrade"
     * (previously a doc-comment hope on the caller) a real invariant.
     */
    public void upgradeToRegistered(AuthProvider provider, String externalProviderId,
            String email, Instant now) {
        if (userLevel != UserLevel.GUEST) {
            throw new IllegalStateException("Only a GUEST user can be upgraded; was " + userLevel);
        }
        if (auth == null) {
            auth = new AuthInfo();
        }
        auth.setAuthProvider(provider);
        auth.setExternalProviderId(externalProviderId);
        emailAddress = email;
        emailVerifiedAt = now;
        userLevel = UserLevel.USER;
        lastLogin = now;
        guestExpiresAt = null;
        reopen(now);
    }

    /**
     * Reopens a closed account and records the login. Idempotent: returns
     * {@code false} (and changes nothing) when the account is already open, so
     * the service can skip a needless save.
     */
    public boolean reopen(Instant now) {
        if (!closed) {
            return false;
        }
        closed = false;
        closedAt = null;
        closedReason = null;
        lastLogin = now;
        return true;
    }

    private static String shortId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}