package com.routefill.controller;

import com.routefill.dto.request.LoginRequest;
import com.routefill.dto.request.RegisterRequest;
import com.routefill.dto.response.ApiResponse;
import com.routefill.dto.response.AuthResponse;
import com.routefill.dto.response.UserDto;
import com.routefill.security.UserDetailsImpl;
import com.routefill.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.ok(ApiResponse.error("Not authenticated"));
        }
        return ResponseEntity.ok(ApiResponse.success(authService.getUserDto(userDetails.getId())));
    }
}
