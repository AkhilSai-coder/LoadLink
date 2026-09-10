package com.routefill.controller;

import com.routefill.dto.request.*;
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
@RequestMapping("/api/booking-requests")
@RequiredArgsConstructor
public class BookingController {
    private final BookingService bookingService;
    private final DisputeService disputeService;
    private final RatingService ratingService;

    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponseDto>> requestBooking(
            @Valid @RequestBody BookingRequestDto req) {
        BookingResponseDto booking = bookingService.requestBooking(req);
        return ResponseEntity.ok(ApiResponse.success(booking));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BookingResponseDto>> getBooking(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(bookingService.getMatch(id)));
    }

    @PostMapping("/{id}/decide")
    public ResponseEntity<ApiResponse<BookingResponseDto>> decideBooking(
            @PathVariable String id,
            @Valid @RequestBody BookingDecisionDto req) {
        BookingResponseDto booking = bookingService.decideBooking(id, req.getDecision(), req.getActorLocation());
        return ResponseEntity.ok(ApiResponse.success(booking));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<ApiResponse<BookingResponseDto>> acceptBooking(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String location = body != null ? body.get("actorLocation") : null;
        BookingResponseDto booking = bookingService.decideBooking(id, "accepted", location);
        return ResponseEntity.ok(ApiResponse.success(booking));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<BookingResponseDto>> rejectBooking(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String location = body != null ? body.get("actorLocation") : null;
        BookingResponseDto booking = bookingService.decideBooking(id, "rejected", location);
        return ResponseEntity.ok(ApiResponse.success(booking));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelBooking(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetailsImpl user) {
        bookingService.cancelBooking(id, user != null ? user.getUsername() : "customer");
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/{id}/dispute")
    public ResponseEntity<ApiResponse<DisputeDto>> raiseDispute(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetailsImpl user,
            @Valid @RequestBody RaiseDisputeRequest req) {
        DisputeDto dispute = disputeService.raiseDispute(id, user.getId(), req.getReason());
        return ResponseEntity.ok(ApiResponse.success(dispute));
    }

    @PostMapping("/{id}/rate")
    public ResponseEntity<ApiResponse<Void>> rateTrip(
            @PathVariable String id,
            @RequestBody RateTripRequest req) {
        ratingService.rateTrip(id, req);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/{id}/ratings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRatings(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(ratingService.getRatingsForMatch(id)));
    }

    @GetMapping("/{id}/readiness")
    public ResponseEntity<ApiResponse<ReadinessDto>> getReadiness(@PathVariable String id) {
        BookingResponseDto b = bookingService.getMatch(id);
        List<ReadinessDto.ChecklistItem> items = List.of(
                ReadinessDto.ChecklistItem.builder().label("Driver verified").ok(b.getDriver() != null && "verified".equalsIgnoreCase(b.getDriver().getKycStatus())).build(),
                ReadinessDto.ChecklistItem.builder().label("Vehicle verified").ok(b.getCapacity() != null && b.getCapacity().getVehicleType() != null).build(),
                ReadinessDto.ChecklistItem.builder().label("Cargo details available").ok(b.getLoad() != null && b.getLoad().getMaterial() != null).build(),
                ReadinessDto.ChecklistItem.builder().label("Digital Road Consignment generated").ok(b.getDigitalRecord() != null).build(),
                ReadinessDto.ChecklistItem.builder().label("Pickup location confirmed").ok(b.getLoad() != null && b.getLoad().getOrigin() != null).build(),
                ReadinessDto.ChecklistItem.builder().label("Delivery location confirmed").ok(b.getLoad() != null && b.getLoad().getDestination() != null).build(),
                ReadinessDto.ChecklistItem.builder().label("Required cargo information verified").ok(b.getLoad() != null && b.getLoad().getMaterial() != null).build()
        );
        boolean ready = items.stream().allMatch(ReadinessDto.ChecklistItem::isOk);
        return ResponseEntity.ok(ApiResponse.success(ReadinessDto.builder().checklist(items).ready(ready).build()));
    }
}
