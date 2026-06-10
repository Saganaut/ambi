package com.cephadex.ambi.user;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.cephadex.ambi.auth.enums.AuthProvider;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByUsername(String username);

    /** Batch lookup by public id — used to overlay embedded author/participant
     *  snapshots with the users' current profile at read time. */
    List<User> findByPublicIdIn(Collection<String> publicIds);

    Optional<User> findByEmailAddress(String emailAddress);

    /**
     * The identity key for an external account is the pair
     * {@code (authProvider, externalProviderId)} — never email (see
     * auth/README.md). Used by the OAuth success handler / register flow.
     */
    Optional<User> findByAuthAuthProviderAndAuthExternalProviderId(
            AuthProvider authProvider, String externalProviderId);

    @Override
    Page<User> findAll(Pageable pageable);

}
