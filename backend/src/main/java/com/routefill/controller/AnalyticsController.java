package com.routefill.controller;

import com.routefill.dto.response.*;
import com.routefill.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {
    private final AdminService adminService;

    @GetMapping({"/platform-stats", "/overview"})
    public ResponseEntity<ApiResponse<PlatformStatsDto>> getPlatformStats() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getPlatformStats()));
    }

    @GetMapping("/corridors")
    public ResponseEntity<ApiResponse<List<CorridorSummaryDto>>> getAllCorridors() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getAllCorridors()));
    }

    @GetMapping("/impact")
    public ResponseEntity<ApiResponse<ImpactDto>> getPlatformImpact() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getPlatformImpact()));
    }
}
