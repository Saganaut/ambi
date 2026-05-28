package com.cephadex.ambi.user;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.AuthInfo;
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

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<User> findById(String id) {
        return userRepository.findById(id);
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

        User guest = new User();
        guest.setPublicId(UUID.randomUUID().toString());
        guest.setUsername("guest-" + shortId());
        guest.setDisplayName("Guest");
        guest.setUserLevel(UserLevel.GUEST);
        guest.setAuth(auth);
        guest.setMembership(new Membership());
        guest.setLastLogin(Instant.now());
        return guest;
    }

    private static String shortId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
