package com.routefill.controller;

import com.routefill.dto.request.VerifyOtpRequest;
import com.routefill.dto.response.*;
import com.routefill.service.ConsignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/consignments")
@RequiredArgsConstructor
public class ConsignmentController {
    private final ConsignmentService consignmentService;

    @GetMapping("/{id}/digital-record")
    public ResponseEntity<ApiResponse<DigitalRecordDto>> getDigitalRecord(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(consignmentService.getDigitalRecord(id)));
    }

    @GetMapping("/{id}/pod")
    public ResponseEntity<ApiResponse<PodDto>> getPOD(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(consignmentService.getPOD(id)));
    }

    @GetMapping("/track/{consignmentId}")
    public ResponseEntity<ApiResponse<TrackingDto>> trackConsignment(@PathVariable String consignmentId) {
        return ResponseEntity.ok(ApiResponse.success(consignmentService.trackConsignment(consignmentId)));
    }

    @PostMapping("/{id}/pickup")
    public ResponseEntity<ApiResponse<BookingResponseDto>> confirmPickup(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String location = body != null ? body.get("location") : null;
        return ResponseEntity.ok(ApiResponse.success(consignmentService.confirmPickup(id, location)));
    }

    @PostMapping("/{id}/in-transit")
    public ResponseEntity<ApiResponse<BookingResponseDto>> startTransit(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String location = body != null ? body.get("location") : null;
        return ResponseEntity.ok(ApiResponse.success(consignmentService.startTransit(id, location)));
    }

    @PostMapping("/{id}/arrived")
    public ResponseEntity<ApiResponse<BookingResponseDto>> markArrived(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String location = body != null ? body.get("location") : null;
        return ResponseEntity.ok(ApiResponse.success(consignmentService.markArrived(id, location)));
    }

    @PostMapping("/{id}/delivery/initiate")
    public ResponseEntity<ApiResponse<Map<String, String>>> initiateDelivery(@PathVariable String id) {
        String otp = consignmentService.initiateDelivery(id);
        return ResponseEntity.ok(ApiResponse.success(Map.of("otp", otp)));
    }

    @PostMapping("/{id}/delivery/verify")
    public ResponseEntity<ApiResponse<BookingResponseDto>> verifyDelivery(
            @PathVariable String id,
            @Valid @RequestBody VerifyOtpRequest req) {
        return ResponseEntity.ok(ApiResponse.success(consignmentService.verifyDeliveryOtp(id, req.getOtp(), req.getReceiverName())));
    }
}
