package com.cephadex.ambi.user;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.cephadex.ambi.auth.enums.AuthProvider;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByUsername(String username);

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
