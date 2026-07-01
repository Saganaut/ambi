package com.cephadex.ambi.common.cache;

/**
 * Canonical Spring cache names, so the strings can't drift between
 * {@link CacheConfig} (which sets per-cache TTLs) and the {@code @Cacheable} /
 * {@code @CacheEvict} annotations on services.
 */
public final class CacheNames {

    private CacheNames() {
    }

    /** Users keyed by their Mongo {@code _id} — populated by findById / requireUser. */
    public static final String USERS = "users";

    /**
     * Users keyed by their OAuth identity ({@code provider:externalProviderId}) —
     * populated by findByProviderAndSubject on the login path.
     */
    public static final String USERS_BY_IDENTITY = "usersByIdentity";
}
