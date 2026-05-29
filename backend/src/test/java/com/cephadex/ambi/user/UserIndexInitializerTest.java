package com.cephadex.ambi.user;

import static org.assertj.core.api.Assertions.assertThat;

import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.cephadex.ambi.config.AmbiApplication;
import com.mongodb.client.MongoCollection;

/**
 * Pins that {@link UserIndexInitializer} actually creates the {@code users}
 * indexes on a real Mongo (auto-index-creation is off, so without the runner
 * none of these exist and both Inv 9 and the guest TTL reaper silently no-op).
 * Reads raw index metadata via the driver so partial-filter and TTL options
 * are asserted directly, not just index presence.
 */
@SpringBootTest(classes = AmbiApplication.class)
@ActiveProfiles("test")
class UserIndexInitializerTest {

    @Autowired
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    private Document indexNamed(String name) {
        MongoCollection<Document> users = mongoTemplate.getCollection("users");
        for (Document index : users.listIndexes()) {
            if (name.equals(index.getString("name"))) {
                return index;
            }
        }
        return null;
    }

    @Test
    void guestTtlIndexExistsWithZeroExpiry() {
        Document ttl = indexNamed("ttl_guest_expires_at");
        assertThat(ttl).as("guest TTL index must exist or the reaper is inert").isNotNull();
        assertThat(ttl.get("key", Document.class)).containsKey("guest_expires_at");
        // expireAfterSeconds = 0 → "delete when the field's date passes".
        assertThat(((Number) ttl.get("expireAfterSeconds")).longValue()).isZero();
    }

    @Test
    void emailIndexIsUniqueAndPartial() {
        Document email = indexNamed("uniq_email_address");
        assertThat(email).isNotNull();
        assertThat(email.getBoolean("unique", false)).isTrue();
        // Partial so emailless guests don't collide on null.
        assertThat(email.get("partialFilterExpression", Document.class))
                .as("email uniqueness must be partial, else a second guest can't be created")
                .containsKey("email_address");
    }

    @Test
    void oauthIdentityIndexIsUniqueCompoundAndPartial() {
        Document identity = indexNamed("uniq_oauth_identity");
        assertThat(identity).isNotNull();
        assertThat(identity.getBoolean("unique", false)).isTrue();
        Document key = identity.get("key", Document.class);
        assertThat(key).containsKeys("auth.auth_provider", "auth.external_provider_id");
        // Partial on external id so INTERNAL guests (null external id) are exempt.
        assertThat(identity.get("partialFilterExpression", Document.class))
                .containsKey("auth.external_provider_id");
    }

    @Test
    void identifierIndexesAreUnique() {
        Document publicId = indexNamed("uniq_public_id");
        Document username = indexNamed("uniq_username");
        assertThat(publicId).isNotNull();
        assertThat(username).isNotNull();
        assertThat(publicId.getBoolean("unique", false)).isTrue();
        assertThat(username.getBoolean("unique", false)).isTrue();
    }
}
