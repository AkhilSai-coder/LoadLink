package com.routefill.controller;

import com.routefill.dto.response.*;
import com.routefill.security.UserDetailsImpl;
import com.routefill.service.AuthService;
import com.routefill.service.BookingService;
import com.routefill.service.CargoLoadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
public class CustomerController {
    private final AuthService authService;
    private final CargoLoadService cargoLoadService;
    private final BookingService bookingService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserDto>> getProfile(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(authService.getUserDto(user.getId())));
    }

    @GetMapping("/loads")
    public ResponseEntity<ApiResponse<List<CargoLoadDto>>> getMyLoads(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(cargoLoadService.getLoadsByCustomer(user.getId())));
    }

    @GetMapping("/bookings")
    public ResponseEntity<ApiResponse<List<BookingResponseDto>>> getMyBookings(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(bookingService.getMatchesForUser(user.getId(), "customer")));
    }

    @GetMapping("/impact")
    public ResponseEntity<ApiResponse<ImpactDto>> getMyImpact(@AuthenticationPrincipal UserDetailsImpl user) {
        var bookings = bookingService.getMatchesForUser(user.getId(), "customer");
        double saved = bookings.stream()
                .filter(b -> "delivered".equalsIgnoreCase(b.getStatus()))
                .mapToDouble(b -> b.getPrice() * 0.44) // traditional is price / 0.69
                .sum();
        double goodsTons = bookings.stream()
                .filter(b -> "delivered".equalsIgnoreCase(b.getStatus()))
                .mapToDouble(b -> "kg".equalsIgnoreCase(b.getUnit()) ? b.getWeightTons() / 1000.0 : b.getWeightTons())
                .sum();

        ImpactDto dto = ImpactDto.builder()
                .totalSaved((double) Math.round(saved))
                .completedConsignments((int) bookings.stream().filter(b -> "delivered".equalsIgnoreCase(b.getStatus())).count())
                .goodsTransportedTons(Math.round(goodsTons * 100.0) / 100.0)
                .estimated(true)
                .build();
        return ResponseEntity.ok(ApiResponse.success(dto));
    }
}
