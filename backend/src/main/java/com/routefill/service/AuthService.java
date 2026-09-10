package com.routefill.service;

import com.routefill.dto.request.LoginRequest;
import com.routefill.dto.request.RegisterRequest;
import com.routefill.dto.response.AuthResponse;
import com.routefill.dto.response.UserDto;
import com.routefill.entity.CustomerProfile;
import com.routefill.entity.DriverProfile;
import com.routefill.entity.User;
import com.routefill.enums.KycStatus;
import com.routefill.enums.UserRole;
import com.routefill.exception.BadRequestException;
import com.routefill.mapper.EntityDtoMapper;
import com.routefill.repository.CustomerProfileRepository;
import com.routefill.repository.DriverProfileRepository;
import com.routefill.repository.UserRepository;
import com.routefill.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final EntityDtoMapper mapper;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.getEmail() != null ? req.getEmail().trim().toLowerCase() : "";
        if (email.isEmpty()) {
            throw new BadRequestException("Email address is required.");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BadRequestException("An account with email " + email + " already exists. Please log in or use a different email.");
        }

        UserRole role = UserRole.fromString(req.getRole());
        if (role == null) {
            throw new BadRequestException("Invalid account role. Must be Shipper (customer) or Captain (driver).");
        }

        String userId = "u_" + UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder()
                .id(userId)
                .email(req.getEmail().trim().toLowerCase())
                .password(passwordEncoder.encode(req.getPassword()))
                .name(req.getName().trim())
                .phone(req.getPhone() != null ? req.getPhone().trim() : "")
                .role(role)
                .build();
        userRepository.save(user);

        if (role == UserRole.CUSTOMER) {
            CustomerProfile cp = CustomerProfile.builder()
                    .id("cp_" + UUID.randomUUID().toString().substring(0, 8))
                    .user(user)
                    .companyName(req.getCompany() != null ? req.getCompany().trim() : "")
                    .build();
            customerProfileRepository.save(cp);
        } else if (role == UserRole.DRIVER) {
            DriverProfile dp = DriverProfile.builder()
                    .id("dp_" + UUID.randomUUID().toString().substring(0, 8))
                    .user(user)
                    .vehicleType(req.getVehicleType() != null ? req.getVehicleType().trim() : "")
                    .vehicleNumber(req.getVehicleNumber() != null ? req.getVehicleNumber().trim() : "")
                    .kycStatus(KycStatus.NONE)
                    .build();
            driverProfileRepository.save(dp);
        }

        String token = jwtUtils.generateJwtToken(user.getEmail());
        UserDto userDto = mapper.toUserDto(user);
        return AuthResponse.builder().ok(true).token(token).user(userDto).build();
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmailIgnoreCase(req.getEmail().trim())
                .orElseThrow(() -> new BadRequestException("Email or password is incorrect."));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new BadRequestException("Email or password is incorrect.");
        }

        String token = jwtUtils.generateJwtToken(user.getEmail());
        UserDto userDto = mapper.toUserDto(user);
        return AuthResponse.builder().ok(true).token(token).user(userDto).build();
    }

    public UserDto getUserDto(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("User not found"));
        return mapper.toUserDto(user);
    }
}
