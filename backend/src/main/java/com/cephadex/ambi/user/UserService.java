package com.cephadex.ambi.user;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.AuthInfo;
import com.cephadex.ambi.auth.config.AuthProperties;
import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.billing.Membership;
import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Owns persistence of {@link User} documents. Auth-flow orchestration (sessions,
 * cookies) lives in the auth package; this service only creates/reads users.
 */
@Service
public class UserService {

    private static final int GUEST_USERNAME_ATTEMPTS = 5;

    private final UserRepository userRepository;
    private final AuthProperties authProperties;

    public UserService(UserRepository userRepository, AuthProperties authProperties) {
        this.userRepository = userRepository;
        this.authProperties = authProperties;
    }

    public Optional<User> findById(String id) {
        return userRepository.findById(id);
    }

    /**
     * Looks up a {@link User} by the OAuth identity pair {@code (provider,
     * externalProviderId)} — the only identity key for an external account
     * (auth/README.md). Email is never the key.
     */
    public Optional<User> findByProviderAndSubject(AuthProvider provider, String externalProviderId) {
        if (provider == null || externalProviderId == null || externalProviderId.isBlank()) {
            return Optional.empty();
        }
        return userRepository.findByAuthAuthProviderAndAuthExternalProviderId(provider, externalProviderId);
    }

    /**
     * Upgrades a {@code GUEST} {@link User} into a registered account in place
     * (auth/README.md Inv 1): the Mongo {@code _id} and existing {@code username}
     * are preserved (guest squat is accepted — Inv 9), and the external identity,
     * email, and {@code userLevel=USER} are written. Reopens the account if it
     * was previously closed. Caller must verify the {@link User} actually is a
     * guest before calling this.
     */
    public User upgradeGuestToRegistered(User guest, AuthProvider provider,
            String externalProviderId, String email) {
        AuthInfo auth = guest.getAuth();
        if (auth == null) {
            auth = new AuthInfo();
            guest.setAuth(auth);
        }
        auth.setAuthProvider(provider);
        auth.setExternalProviderId(externalProviderId);
        guest.setEmailAddress(email);
        guest.setEmailVerifiedAt(Instant.now());
        guest.setUserLevel(UserLevel.USER);
        guest.setLastLogin(Instant.now());
        // Critical: the upgraded account is no longer a guest, so it must not
        // be subject to the TTL reaper. Clear the field before save.
        guest.setGuestExpiresAt(null);
        if (guest.isClosed()) {
            guest.setClosed(false);
            guest.setClosedAt(null);
            guest.setClosedReason(null);
        }
        try {
            return userRepository.save(guest);
        } catch (DuplicateKeyException ex) {
            // Username/publicId already belong to this same guest doc, so the
            // collision can only be on the (now-set) email. The owner of that
            // email should sign in via their existing account instead.
            throw new ConflictException("EMAIL_TAKEN",
                    "That email is already linked to a different account.");
        }
    }

    /**
     * Creates a freshly registered {@link User} from a {@code PRE_REGISTRATION}
     * session. Identity ({@code provider}, {@code externalProviderId},
     * {@code email}) comes from the authenticated session principal — never
     * from request input (auth/README.md Inv 5). The DB owns uniqueness
     * (Inv 9): a duplicate-key collision on {@code username} surfaces as
     * {@code USERNAME_TAKEN}.
     */
    public User register(AuthProvider provider, String externalProviderId, String email,
            String username, String displayName) {
        AuthInfo auth = new AuthInfo();
        auth.setAuthProvider(provider);
        auth.setExternalProviderId(externalProviderId);

        User user = new User();
        user.setPublicId(UUID.randomUUID().toString());
        user.setUsername(username);
        user.setDisplayName(displayName != null && !displayName.isBlank() ? displayName : username);
        user.setEmailAddress(email);
        user.setEmailVerifiedAt(Instant.now());
        user.setUserLevel(UserLevel.USER);
        user.setAuth(auth);
        user.setMembership(new Membership());
        user.setLastLogin(Instant.now());
        try {
            return userRepository.save(user);
        } catch (DuplicateKeyException ex) {
            // Could be username or email; the frontend mostly surfaces this on
            // the username field. Email collision proper is handled by the
            // caller checking findByProviderAndSubject first (idempotent path).
            throw new ConflictException("USERNAME_TAKEN",
                    "That username is already taken.");
        }
    }

    /** Reopens a previously-closed account; idempotent. */
    public User reopen(User user) {
        if (!user.isClosed()) {
            return user;
        }
        user.setClosed(false);
        user.setClosedAt(null);
        user.setClosedReason(null);
        user.setLastLogin(Instant.now());
        return userRepository.save(user);
    }

    /**
     * Creates and persists a fresh {@code GUEST} user: internal auth, no email,
     * an auto-generated username. Uniqueness is enforced by the DB index
     * (auth/README.md Inv 9), so a duplicate-key collision is just retried with a
     * new username rather than checked-then-acted in code.
     */
    public User createGuest() {
        DuplicateKeyException last = null;
        for (int attempt = 0; attempt < GUEST_USERNAME_ATTEMPTS; attempt++) {
            User guest = newGuest();
            try {
                return userRepository.save(guest);
            } catch (DuplicateKeyException ex) {
                last = ex; // username (or publicId) collided — try a fresh one
            }
        }
        throw new ConflictException("GUEST_CREATE_FAILED",
                "Could not allocate a unique guest identity, please retry.");
    }

    private User newGuest() {
        AuthInfo auth = new AuthInfo();
        auth.setAuthProvider(AuthProvider.INTERNAL);
        auth.setExternalProviderId(null);

        Instant now = Instant.now();
        User guest = new User();
        guest.setPublicId(UUID.randomUUID().toString());
        guest.setUsername("guest-" + shortId());
        guest.setDisplayName("Guest");
        guest.setUserLevel(UserLevel.GUEST);
        guest.setAuth(auth);
        guest.setMembership(new Membership());
        guest.setLastLogin(now);
        // TTL reaper hook: Mongo's TTL monitor deletes the document once this
        // instant passes. Set only for guests; cleared on upgrade.
        guest.setGuestExpiresAt(now.plus(authProperties.getGuest().getTtl()));
        return guest;
    }

    private static String shortId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
