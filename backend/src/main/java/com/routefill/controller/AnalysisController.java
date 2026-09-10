package com.routefill.controller;

import com.routefill.dto.response.ApiResponse;
import com.routefill.entity.AiAnalysisLog;
import com.routefill.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/analysis")
@RequiredArgsConstructor
public class AnalysisController {
    private final AdminService adminService;

    @GetMapping("/{entityType}/{entityId}")
    public ResponseEntity<ApiResponse<List<AiAnalysisLog>>> getLogs(
            @PathVariable String entityType,
            @PathVariable String entityId) {
        return ResponseEntity.ok(ApiResponse.success(adminService.getLogsForEntity(entityType, entityId)));
    }
}
