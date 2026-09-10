package com.routefill.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private boolean ok;
    private String token;
    private UserDto user;
    private String error;
}
