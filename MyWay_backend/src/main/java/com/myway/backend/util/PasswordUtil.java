package com.myway.backend.util;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PasswordUtil {

    private final PasswordEncoder passwordEncoder;

    public String hashPassword(String password) {
        if (password == null) {
            throw new IllegalArgumentException("Password cannot be null");
        }
        return passwordEncoder.encode(password);
    }

    public boolean checkPassword(String password, String hashPassword) {
        if (hashPassword == null) {
            throw new IllegalArgumentException("Hash Password cannot be null");
        }
        return passwordEncoder.matches(password, hashPassword);
    }
}
