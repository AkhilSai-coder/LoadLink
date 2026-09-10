package com.routefill.controller;

import com.routefill.dto.response.ApiResponse;
import com.routefill.dto.response.CorridorSummaryDto;
import com.routefill.dto.response.ImpactDto;
import com.routefill.dto.response.PriceEstimateDto;
import com.routefill.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PublicController {
    private final AdminService adminService;

    @GetMapping("/corridors")
    public ResponseEntity<ApiResponse<List<CorridorSummaryDto>>> getCorridors() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getAllCorridors()));
    }

    @GetMapping("/platform/impact")
    public ResponseEntity<ApiResponse<ImpactDto>> getImpact() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getPlatformImpact()));
    }

    @GetMapping("/price-comparison")
    public ResponseEntity<ApiResponse<PriceEstimateDto>> estimatePrice(@RequestParam double price) {
        double rf = price;
        double trad = Math.round((rf / 0.69) / 50.0) * 50;
        double savings = Math.max(0, trad - rf);
        int savingsPct = trad > 0 ? (int) Math.round((savings / trad) * 100) : 0;
        return ResponseEntity.ok(ApiResponse.success(PriceEstimateDto.builder()
                .traditional(trad)
                .routefill(rf)
                .savings(savings)
                .savingsPct(savingsPct)
                .estimated(true)
                .build()));
    }
}
