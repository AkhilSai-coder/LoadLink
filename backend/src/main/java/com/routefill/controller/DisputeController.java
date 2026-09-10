package com.routefill.controller;

import com.routefill.dto.request.DisputeResolutionRequest;
import com.routefill.dto.response.ApiResponse;
import com.routefill.dto.response.DisputeDto;
import com.routefill.security.UserDetailsImpl;
import com.routefill.service.DisputeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/disputes")
@RequiredArgsConstructor
public class DisputeController {
    private final DisputeService disputeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DisputeDto>>> getAllDisputes() {
        return ResponseEntity.ok(ApiResponse.success(disputeService.getAllDisputes()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DisputeDto>> raiseDispute(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        String matchId = body.get("matchId");
        String reason = body.get("reason");
        return ResponseEntity.ok(ApiResponse.success(disputeService.raiseDispute(matchId, userDetails.getId(), reason)));
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<Void>> resolveDispute(
            @PathVariable String id,
            @Valid @RequestBody DisputeResolutionRequest req) {
        disputeService.resolveDispute(id, req.getResolutionNote());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
