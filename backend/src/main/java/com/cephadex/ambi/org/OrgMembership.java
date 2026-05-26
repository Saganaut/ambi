package com.cephadex.ambi.org;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.org.enums.OrgRole;

public record OrgMembership(
        @Field("org_id") String orgId,
        @Field("org_role") OrgRole orgRole) {
}
