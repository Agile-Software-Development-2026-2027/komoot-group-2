package com.myway.backend.service.auth;

import com.myway.backend.dto.user.AuthResponseDTO;
import com.myway.backend.dto.user.LoginRequestDTO;
import com.myway.backend.dto.user.RegisterRequestDTO;
import com.myway.backend.dto.user.UserProfileDTO;
import com.myway.backend.util.LoginRequired;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDTO> register(@Valid @RequestBody RegisterRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/get_user")
    @LoginRequired
    public ResponseEntity<UserProfileDTO> getUser(Authentication authentication) {
        // JWTFilter stores the token's subject (the email) as the authentication name
        return ResponseEntity.ok(authService.getUser(authentication.getName()));
    }
}
