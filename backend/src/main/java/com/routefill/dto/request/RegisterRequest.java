package com.routefill.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {
    @NotBlank
    private String role; // customer / driver

    @NotBlank
    private String name;

    private String phone;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;

    private String company;
    private String vehicleType;
    private String vehicleNumber;
}
