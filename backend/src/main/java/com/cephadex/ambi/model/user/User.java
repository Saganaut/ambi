package com.cephadex.ambi.model.user;

import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.model.enums.user.UserLevel;
import com.cephadex.ambi.model.shared.Auditable;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(exclude = { "auth" })
@Document(collection = "users")
public class User extends Auditable {

    @Id
    private String id;

    @Indexed(unique = true)
    @Field("public_id")
    private String publicId;

    @Indexed(unique = true)
    @Field("username")
    private String username;

    @Indexed(unique = true)
    @Field("email_address")
    private String emailAddress;

    @Field("display_name")
    private String displayName;

    @Field("email_verified_at")
    private Instant emailVerifiedAt;

    @Field("last_login")
    private Instant lastLogin;

    @Field("timezone")
    private String timezone;

    @Field("auth")
    private AuthInfo auth;

    @Field("avatar")
    private Avatar avatar;

    @Field("preferences")
    private UserPreferences preferences;

    @Field("membership")
    private Membership membership;

    @Field("user_level")
    private UserLevel userLevel = UserLevel.USER;

    @Field("is_closed")
    private boolean closed;

    @Field("closed_at")
    private Instant closedAt;

    @Field("closed_reason")
    private String closedReason;

    @Field("org_roles")
    private List<OrgRoles> orgRoles;
}