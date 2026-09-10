package com.routefill.controller;

import com.routefill.dto.request.BillDecisionRequest;
import com.routefill.dto.request.DisputeResolutionRequest;
import com.routefill.dto.request.KycDecisionRequest;
import com.routefill.dto.response.*;
import com.routefill.entity.AiAnalysisLog;
import com.routefill.service.AdminService;
import com.routefill.service.BillService;
import com.routefill.service.DisputeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final AdminService adminService;
    private final BillService billService;
    private final DisputeService disputeService;

    @GetMapping("/kyc-queue")
    public ResponseEntity<ApiResponse<List<UserDto>>> getKycQueue() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getKycQueue()));
    }

    @GetMapping("/drivers")
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllDrivers() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getAllDrivers()));
    }

    @PostMapping({"/kyc/{driverId}/decide", "/kyc/{driverId}/review"})
    public ResponseEntity<ApiResponse<Void>> decideKyc(
            @PathVariable String driverId,
            @Valid @RequestBody KycDecisionRequest req) {
        adminService.decideKyc(driverId, req.getDecision(), req.getNote());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping({"/bills", "/bill-queue"})
    public ResponseEntity<ApiResponse<List<BillDto>>> getBillQueue() {
        return ResponseEntity.ok(ApiResponse.success(billService.getPendingBillQueue()));
    }

    @PostMapping({"/bills/{billId}/decide", "/bills/{billId}/review"})
    public ResponseEntity<ApiResponse<Void>> decideBill(
            @PathVariable String billId,
            @Valid @RequestBody BillDecisionRequest req) {
        billService.decideBill(billId, req.getDecision());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping({"/disputes", "/dispute-queue"})
    public ResponseEntity<ApiResponse<List<DisputeDto>>> getDisputes() {
        return ResponseEntity.ok(ApiResponse.success(disputeService.getAllDisputes()));
    }

    @PostMapping({"/disputes/{disputeId}/resolve", "/disputes/{disputeId}/decide"})
    public ResponseEntity<ApiResponse<Void>> resolveDispute(
            @PathVariable String disputeId,
            @Valid @RequestBody DisputeResolutionRequest req) {
        disputeService.resolveDispute(disputeId, req.getResolutionNote());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/analytics/overview")
    public ResponseEntity<ApiResponse<PlatformStatsDto>> getPlatformStats() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getPlatformStats()));
    }

    @GetMapping("/analytics/corridors")
    public ResponseEntity<ApiResponse<List<CorridorSummaryDto>>> getAllCorridors() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getAllCorridors()));
    }

    @GetMapping("/analytics/impact")
    public ResponseEntity<ApiResponse<ImpactDto>> getPlatformImpact() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getPlatformImpact()));
    }

    @GetMapping("/flagged")
    public ResponseEntity<ApiResponse<List<AiAnalysisLog>>> getFlaggedRecords() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getFlaggedRecords()));
    }

    @GetMapping("/auto-rejected")
    public ResponseEntity<ApiResponse<List<AiAnalysisLog>>> getAutoRejected() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getAutoRejectedRecords()));
    }
}
