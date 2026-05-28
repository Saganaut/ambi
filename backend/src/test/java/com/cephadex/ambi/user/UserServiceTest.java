package com.cephadex.ambi.user;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.dao.DuplicateKeyException;

import com.cephadex.ambi.auth.config.AuthProperties;
import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Pins the guest TTL lifecycle (auth/README.md guest-User reaper) and the
 * uniqueness-is-DB-authoritative contract (Inv 9): username collisions
 * surface as {@code USERNAME_TAKEN}, guests retry on collision, upgrades
 * clear the reaper field so a registered account isn't reaped.
 */
class UserServiceTest {

    private UserRepository userRepository;
    private AuthProperties authProperties;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        authProperties = new AuthProperties();
        userService = new UserService(userRepository, authProperties);
        // Echo back whatever the service tries to save — most tests want to
        // inspect the in-flight User, not a re-fetched one.
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void createGuestSetsGuestExpiresAtFromAuthProperties() {
        Instant before = Instant.now();
        User guest = userService.createGuest();

        assertThat(guest.getUserLevel()).isEqualTo(UserLevel.GUEST);
        assertThat(guest.getGuestExpiresAt()).isNotNull();
        // Default TTL is 7 days; allow a small drift around "now".
        Duration delta = Duration.between(before, guest.getGuestExpiresAt());
        assertThat(delta).isBetween(Duration.ofDays(7).minusMinutes(1), Duration.ofDays(7).plusMinutes(1));
    }

    @Test
    void createGuestRespectsConfiguredTtl() {
        authProperties.getGuest().setTtl(Duration.ofHours(12));

        User guest = userService.createGuest();

        assertThat(Duration.between(Instant.now(), guest.getGuestExpiresAt()))
                .isLessThanOrEqualTo(Duration.ofHours(12));
    }

    @Test
    void createGuestRetriesOnDuplicateUsername() {
        when(userRepository.save(any(User.class)))
                .thenThrow(new DuplicateKeyException("username clash"))
                .thenAnswer(inv -> inv.getArgument(0));

        User guest = userService.createGuest();

        assertThat(guest).isNotNull();
        verify(userRepository, times(2)).save(any(User.class));
    }

    @Test
    void createGuestSurfacesPersistentCollisionsAsConflict() {
        when(userRepository.save(any(User.class)))
                .thenThrow(new DuplicateKeyException("never resolves"));

        assertThatThrownBy(() -> userService.createGuest())
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("guest");
    }

    @Test
    void upgradeGuestToRegisteredClearsGuestExpiresAt() {
        // The reaper field MUST be cleared, otherwise the now-registered account
        // would be deleted by Mongo's TTL monitor at the original expiry.
        User guest = userService.createGuest();
        assertThat(guest.getGuestExpiresAt()).isNotNull();

        User upgraded = userService.upgradeGuestToRegistered(
                guest, AuthProvider.GOOGLE, "google-sub-1", "user@example.com");

        assertThat(upgraded.getGuestExpiresAt()).isNull();
        assertThat(upgraded.getUserLevel()).isEqualTo(UserLevel.USER);
        assertThat(upgraded.getAuth().getAuthProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(upgraded.getAuth().getExternalProviderId()).isEqualTo("google-sub-1");
        assertThat(upgraded.getEmailAddress()).isEqualTo("user@example.com");
    }

    @Test
    void upgradeGuestReopensClosedAccount() {
        User guest = userService.createGuest();
        guest.setClosed(true);
        guest.setClosedAt(Instant.now().minus(1, ChronoUnit.DAYS));
        guest.setClosedReason("user request");

        User upgraded = userService.upgradeGuestToRegistered(
                guest, AuthProvider.GOOGLE, "g", "e@x.com");

        assertThat(upgraded.isClosed()).isFalse();
        assertThat(upgraded.getClosedAt()).isNull();
        assertThat(upgraded.getClosedReason()).isNull();
    }

    @Test
    void registerCreatesNonGuestWithoutTtl() {
        // Identity comes from the PRE_REG session (Inv 5); the new User should
        // not carry guestExpiresAt — it's a registered account from the start.
        User created = userService.register(
                AuthProvider.GOOGLE, "google-sub-2", "new@example.com",
                "newname", "New Person");

        assertThat(created.getGuestExpiresAt()).isNull();
        assertThat(created.getUserLevel()).isEqualTo(UserLevel.USER);
        assertThat(created.getUsername()).isEqualTo("newname");
        assertThat(created.getEmailAddress()).isEqualTo("new@example.com");
    }

    @Test
    void registerSurfacesUsernameCollisionAsConflict() {
        when(userRepository.save(any(User.class)))
                .thenThrow(new DuplicateKeyException("dup username"));

        assertThatThrownBy(() -> userService.register(
                AuthProvider.GOOGLE, "sub", "e@x.com", "taken", null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("username");
    }

    @Test
    void reopenIsIdempotentForActiveAccounts() {
        User active = new User();
        active.setClosed(false);

        User result = userService.reopen(active);

        assertThat(result).isSameAs(active);
        verify(userRepository, times(0)).save(any(User.class));
    }

    @Test
    void findByProviderAndSubjectRejectsBlankInputs() {
        // No DB hit when the identity pair is incomplete — protects against
        // accidentally matching User docs whose externalProviderId is null
        // (e.g. the guests we just created).
        assertThat(userService.findByProviderAndSubject(null, "sub")).isEmpty();
        assertThat(userService.findByProviderAndSubject(AuthProvider.GOOGLE, null)).isEmpty();
        assertThat(userService.findByProviderAndSubject(AuthProvider.GOOGLE, "  ")).isEmpty();
        verify(userRepository, times(0))
                .findByAuthAuthProviderAndAuthExternalProviderId(any(), any());
    }

    @Test
    void findByProviderAndSubjectDelegatesWhenInputsValid() {
        User found = new User();
        when(userRepository.findByAuthAuthProviderAndAuthExternalProviderId(AuthProvider.GOOGLE, "sub"))
                .thenReturn(Optional.of(found));

        assertThat(userService.findByProviderAndSubject(AuthProvider.GOOGLE, "sub"))
                .containsSame(found);
    }

    @Test
    void createGuestPopulatesAuthInternalProviderAndUsername() {
        // Captures the document handed to repo.save to pin the schema-level
        // commitments: INTERNAL provider, no email, username prefix.
        userService.createGuest();
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());

        User saved = captor.getValue();
        assertThat(saved.getAuth().getAuthProvider()).isEqualTo(AuthProvider.INTERNAL);
        assertThat(saved.getAuth().getExternalProviderId()).isNull();
        assertThat(saved.getEmailAddress()).isNull();
        assertThat(saved.getUsername()).startsWith("guest-");
        assertThat(saved.getPublicId()).isNotBlank();
        assertThat(saved.getMembership()).isNotNull();
    }
}
