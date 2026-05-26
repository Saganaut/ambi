package com.cephadex.ambi.user;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.org.enums.OrgRole;

import lombok.Data;

@Data
public class OrgRoles {

    @Field("org_id")
    private String orgId;

    @Field("org_role")
    private OrgRole orgRole;

}
