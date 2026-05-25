package com.cephadex.ambi.model.user;

import org.springframework.data.annotation.Id;

public class User {

    @Id
    private String id;

    private String publicId;

    private String username;

    private String emailAddress;

}
