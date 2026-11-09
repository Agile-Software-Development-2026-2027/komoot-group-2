package com.myway.backend.util;

import com.myway.backend.service.exceptions.EncryptionException;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Component;

@Component
public class PasswordUtil {

    // salt:
    private static final int WORK_LOAD = 12;

    public String hashPassword(String password) {
        if (password == null) {
            throw new IllegalArgumentException("Password cannot be null");
        }
        return BCrypt.hashpw(password, BCrypt.gensalt(WORK_LOAD));
    }

    public boolean checkPassword(String password, String hashPassword) {
        if (hashPassword == null) {
            throw new EncryptionException("Hash Password null");
        }

        return BCrypt.checkpw(password, hashPassword);
    }

}
