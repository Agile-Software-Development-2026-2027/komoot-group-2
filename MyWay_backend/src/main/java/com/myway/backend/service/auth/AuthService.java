package com.myway.backend.service.auth;

import com.myway.backend.dto.user.AuthResponseDTO;
import com.myway.backend.dto.user.LoginRequestDTO;
import com.myway.backend.dto.user.RegisterRequestDTO;
import com.myway.backend.dto.user.UserProfileDTO;

public interface AuthService {

    /** @throws com.myway.backend.service.exceptions.EmailAlreadyUsedException if the email is taken */
    AuthResponseDTO register(RegisterRequestDTO request);

    /** @throws com.myway.backend.service.exceptions.InvalidCredentialsException on unknown email or wrong password */
    AuthResponseDTO login(LoginRequestDTO request);

    /** @throws com.myway.backend.service.exceptions.UserNotFoundException if the user no longer exists */
    UserProfileDTO getUser(String email);
}
