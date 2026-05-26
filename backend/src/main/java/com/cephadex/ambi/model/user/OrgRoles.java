package com.cephadex.ambi.model.user;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.model.enums.org.OrgRole;

import lombok.Data;

@Data
public class OrgRoles {

    @Field("org_id")
    private String orgId;

    @Field("org_role")
    private OrgRole orgRole;

}
