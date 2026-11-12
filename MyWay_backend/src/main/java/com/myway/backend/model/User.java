package com.myway.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @Column(length = 255)
    private String email;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    /** BCrypt hash (see PasswordUtil), never the plain password. */
    @Column(nullable = false, length = 255)
    private String password;
}
