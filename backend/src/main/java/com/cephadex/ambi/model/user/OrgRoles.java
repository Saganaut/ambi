package com.cephadex.ambi.model.user;

import com.cephadex.ambi.model.enums.org.OrgRole;

import lombok.Data;

@Data
public class OrgRoles {
    private String orgId;

    private OrgRole orgRole;

}
