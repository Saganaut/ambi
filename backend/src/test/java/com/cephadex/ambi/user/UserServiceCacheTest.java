package com.cephadex.ambi.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.common.cache.CacheNames;
import com.cephadex.ambi.config.AmbiApplication;

/**
 * Proves the Redis cache layer end-to-end on {@link UserService}: reads are
 * cached (and the {@code users} entry is shared between {@code findById} and
 * {@code requireUser}), writes evict, and absent-identity lookups are not
 * negatively cached. Runs with caching flipped <em>on</em> (the suite default is
 * {@code spring.cache.type=none}) against the real local Redis + Mongo
 * (compose.yaml), with {@link UserRepository} wrapped in a Mockito spy so
 * repository reads can be counted.
 */
@SpringBootTest(classes = AmbiApplication.class, properties = {
        "spring.cache.type=redis",
        "ambi.cache.enabled=true"
})
@ActiveProfiles("test")
class UserServiceCacheTest {

    private static final String SUBJECT = "sub-cache-test";

    @Autowired
    private UserService userService;

    @Autowired
    private CacheManager cacheManager;

    @MockitoSpyBean
    private UserRepository userRepository;

    private String userId;

    @BeforeEach
    void setUp() {
        clearCaches();
        // Remove any leftover from a prior failed run (keyed by the stable identity),
        // then seed a fresh registered user to read/mutate.
        userRepository.findByAuthAuthProviderAndAuthExternalProviderId(AuthProvider.GOOGLE, SUBJECT)
                .ifPresent(existing -> userRepository.deleteById(existing.getId()));
        User seeded = userService.register(AuthProvider.GOOGLE, SUBJECT,
                "cache-test@example.com", "cachetestuser", "Cache Test");
        userId = seeded.getId();
        clearCaches();
        clearInvocations(userRepository);
    }

    @AfterEach
    void tearDown() {
        if (userId != null) {
            userRepository.deleteById(userId);
        }
        clearCaches();
    }

    private void clearCaches() {
        cacheManager.getCache(CacheNames.USERS).clear();
        cacheManager.getCache(CacheNames.USERS_BY_IDENTITY).clear();
    }

    @Test
    void readIsCachedAndSharedBetweenFindByIdAndRequireUser() {
        assertThat(userService.findById(userId)).isPresent();
        assertThat(userService.findById(userId)).isPresent();
        // Second findById is served from cache — only one repository read.
        verify(userRepository, times(1)).findById(userId);

        // requireUser shares the same 'users' entry (Spring unwraps the Optional
        // before storing), so it hits the cache and adds no repository read.
        assertThat(userService.requireUser(userId).getId()).isEqualTo(userId);
        verify(userRepository, times(1)).findById(userId);
    }

    @Test
    void writeEvictsUserCache() {
        userService.findById(userId);           // populate the cache with the original user
        clearInvocations(userRepository);

        userService.updateProfile(userId, "Renamed", null, null);
        clearInvocations(userRepository);       // ignore the write's internal requireUser read

        User reread = userService.findById(userId).orElseThrow();
        // The write evicted the entry, so this read goes through to the repository…
        verify(userRepository, times(1)).findById(userId);
        // …and returns the updated value, not a stale cached one.
        assertThat(reread.getDisplayName()).isEqualTo("Renamed");
    }

    @Test
    void absentIdentityIsNotNegativelyCached() {
        String absent = "sub-absent-none";
        assertThat(userService.findByProviderAndSubject(AuthProvider.GOOGLE, absent)).isEmpty();
        assertThat(userService.findByProviderAndSubject(AuthProvider.GOOGLE, absent)).isEmpty();
        // Optional.empty() is never cached (unless=#result==null + disableCachingNullValues),
        // so both lookups consult the repository rather than a stale tombstone.
        verify(userRepository, times(2))
                .findByAuthAuthProviderAndAuthExternalProviderId(AuthProvider.GOOGLE, absent);
    }
}
