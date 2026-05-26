package com.cephadex.ambi.model.user;

import java.time.Instant;
import java.util.Set;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.cephadex.ambi.model.enums.user.UserLevel;
import com.cephadex.ambi.model.shared.Auditable;

import lombok.Data;

@Data
@Document(collection = "users")
public class User extends Auditable {

    @Id
    private String id;

    @Indexed(unique = true)
    private String publicId;

    @Indexed(unique = true)
    private String username;

    @Indexed(unique = true)
    private String emailAddress;

    private String displayName;

    private Instant emailVerifiedAt;

    private Instant lastLogin;

    private String timezone;

    private AuthInfo auth;

    private Avatar avatar;

    private UserPreferences preferences;

    private Membership membership;

    private UserLevel userLevel = UserLevel.USER;

    private boolean closed;

    private Instant closedAt;

    private String closedReason;

    private Set<OrgRoles> orgRoles;
}
