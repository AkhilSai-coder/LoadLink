package com.routefill.controller;

import com.routefill.dto.request.KycSubmitRequest;
import com.routefill.dto.request.SubmitBillRequest;
import com.routefill.dto.response.*;
import com.routefill.security.UserDetailsImpl;
import com.routefill.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/driver")
@RequiredArgsConstructor
public class DriverController {
    private final AuthService authService;
    private final RoadTripService roadTripService;
    private final BookingService bookingService;
    private final DriverService driverService;
    private final BillService billService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserDto>> getProfile(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(authService.getUserDto(user.getId())));
    }

    @GetMapping("/trips")
    public ResponseEntity<ApiResponse<List<RoadTripDto>>> getMyTrips(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(roadTripService.getTripsByDriver(user.getId())));
    }

    @GetMapping("/bookings")
    public ResponseEntity<ApiResponse<List<BookingResponseDto>>> getMyBookings(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(bookingService.getMatchesForUser(user.getId(), "driver")));
    }

    @GetMapping("/trust-profile")
    public ResponseEntity<ApiResponse<DriverTrustDto>> getTrustProfile(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(driverService.getDriverTrustProfile(user.getId())));
    }

    @GetMapping("/impact")
    public ResponseEntity<ApiResponse<ImpactDto>> getDriverImpact(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(driverService.getDriverImpact(user.getId())));
    }

    @PostMapping("/kyc")
    public ResponseEntity<ApiResponse<Void>> submitKyc(
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestBody KycSubmitRequest req) {
        driverService.submitKyc(user.getId(), req);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/trip-photos")
    public ResponseEntity<ApiResponse<TripPhotoDto>> addTripPhoto(
            @RequestBody Map<String, String> body) {
        String matchId = body.get("matchId");
        String type = body.get("type");
        String label = body.get("label");
        return ResponseEntity.ok(ApiResponse.success(driverService.addTripPhoto(matchId, type, label)));
    }

    @GetMapping("/trip-photos/{bookingId}")
    public ResponseEntity<ApiResponse<List<TripPhotoDto>>> getTripPhotos(@PathVariable String bookingId) {
        return ResponseEntity.ok(ApiResponse.success(driverService.getTripPhotos(bookingId)));
    }

    @PostMapping("/bills")
    public ResponseEntity<ApiResponse<BillDto>> submitBill(
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestParam String matchId,
            @Valid @RequestBody SubmitBillRequest req) {
        return ResponseEntity.ok(ApiResponse.success(billService.submitBill(matchId, user.getId(), req)));
    }

    @GetMapping("/bills")
    public ResponseEntity<ApiResponse<List<BillDto>>> getMyBills(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(billService.getBillsForDriver(user.getId())));
    }
}
