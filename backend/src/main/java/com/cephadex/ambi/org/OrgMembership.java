package com.cephadex.ambi.org;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.org.enums.OrgRole;

import lombok.Data;

@Data
public class OrgMembership {

    @Field("org_id")
    private String orgId;

    @Field("org_role")
    private OrgRole orgRole;

}
