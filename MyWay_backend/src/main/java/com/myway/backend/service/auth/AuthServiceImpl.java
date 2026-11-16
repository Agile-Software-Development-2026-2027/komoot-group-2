package com.myway.backend.service.auth;

import com.myway.backend.dto.user.AuthResponseDTO;
import com.myway.backend.dto.user.LoginRequestDTO;
import com.myway.backend.dto.user.RegisterRequestDTO;
import com.myway.backend.dto.user.UserProfileDTO;
import com.myway.backend.model.User;
import com.myway.backend.repository.UserRepository;
import com.myway.backend.service.exceptions.EmailAlreadyUsedException;
import com.myway.backend.service.exceptions.InvalidCredentialsException;
import com.myway.backend.service.exceptions.UserNotFoundException;
import com.myway.backend.util.JWTService;
import org.springframework.security.crypto.password.PasswordEncoder;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JWTService jwtService;

    @Override
    public AuthResponseDTO register(RegisterRequestDTO request) {
        String email = normalize(request.getEmail());

        if (userRepository.existsById(email)) {
            throw new EmailAlreadyUsedException();
        }

        User user = User.builder()
                .email(email)
                .username(request.getUsername().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // two concurrent registrations with the same email
            throw new EmailAlreadyUsedException();
        }

        return toAuthResponse(user);
    }

    @Override
    public AuthResponseDTO login(LoginRequestDTO request) {
        // same exception for unknown email and wrong password, so emails can't be enumerated
        User user = userRepository.findById(normalize(request.getEmail()))
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException();
        }

        return toAuthResponse(user);
    }

    @Override
    public UserProfileDTO getUser(String email) {
        return userRepository.findById(email)
                .map(this::toProfile)
                .orElseThrow(UserNotFoundException::new);
    }

    private String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private UserProfileDTO toProfile(User user) {
        return UserProfileDTO.builder().email(user.getEmail()).username(user.getUsername()).build();
    }

    private AuthResponseDTO toAuthResponse(User user) {
        return AuthResponseDTO.builder()
                .token(jwtService.generateToken(user.getEmail()))
                .user(toProfile(user))
                .build();
    }
}
