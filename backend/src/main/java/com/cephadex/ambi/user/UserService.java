package com.cephadex.ambi.user;

import java.time.Instant;
import java.util.Optional;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.config.AuthProperties;
import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.common.exception.ConflictException;

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
     * was previously closed. The aggregate enforces that the {@link User} is a
     * guest ({@code IllegalStateException} otherwise).
     */
    public User upgradeGuestToRegistered(User guest, AuthProvider provider,
            String externalProviderId, String email) {
        // The transition (identity, level, reaper-field clearing, reopen) is
        // the aggregate's invariant to enforce; this service only persists it
        // and translates the DB's uniqueness verdict.
        guest.upgradeToRegistered(provider, externalProviderId, email, Instant.now());
        try {
            return userRepository.save(guest);
        } catch (DuplicateKeyException ex) {
            // Username/publicId already belong to this same guest doc, so the
            // collision is on the newly-set email OR the (provider, sub) identity
            // — both mean this OAuth identity/email already has an account, so
            // the user should sign in to that one instead of upgrading.
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
        User user = User.newRegistered(provider, externalProviderId, email, username,
                displayName, Instant.now());
        try {
            return userRepository.save(user);
        } catch (DuplicateKeyException ex) {
            String index = ex.getMessage() == null ? "" : ex.getMessage();
            if (index.contains("uniq_oauth_identity")) {
                // Another writer registered the same OAuth identity between our
                // findByProviderAndSubject check and this save. The identity
                // index (not check-then-act) is the authority — converge on the
                // winner so register stays idempotent (Inv 8) under the race.
                return findByProviderAndSubject(provider, externalProviderId)
                        .map(existing -> existing.isClosed() ? reopen(existing) : existing)
                        .orElseThrow(() -> new ConflictException("REGISTRATION_RACE",
                                "Registration is already in progress; please retry."));
            }
            if (index.contains("uniq_email_address")) {
                throw new ConflictException("EMAIL_TAKEN",
                        "That email is already linked to a different account.");
            }
            throw new ConflictException("USERNAME_TAKEN",
                    "That username is already taken.");
        }
    }

    /** Reopens a previously-closed account; idempotent (no save when already open). */
    public User reopen(User user) {
        if (user.reopen(Instant.now())) {
            return userRepository.save(user);
        }
        return user;
    }

    /**
     * Creates and persists a fresh {@code GUEST} user: internal auth, no email,
     * an auto-generated username. Uniqueness is enforced by the DB index
     * (auth/README.md Inv 9), so a duplicate-key collision is just retried with a
     * new username rather than checked-then-acted in code.
     */
    public User createGuest() {
        for (int attempt = 0; attempt < GUEST_USERNAME_ATTEMPTS; attempt++) {
            // Config access stays here: resolve the TTL and hand the aggregate
            // a ready instant. Each attempt mints a fresh username, so a
            // duplicate-key collision is just retried (Inv 9), not checked.
            Instant now = Instant.now();
            User guest = User.newGuest(now, now.plus(authProperties.getGuest().getTtl()));
            try {
                return userRepository.save(guest);
            } catch (DuplicateKeyException ex) {
                // username (or publicId) collided — loop and try a fresh one
            }
        }
        throw new ConflictException("GUEST_CREATE_FAILED",
                "Could not allocate a unique guest identity, please retry.");
    }
}
