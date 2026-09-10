package com.routefill.controller;

import com.routefill.dto.request.CreateCargoLoadRequest;
import com.routefill.dto.response.ApiResponse;
import com.routefill.dto.response.CargoLoadDto;
import com.routefill.dto.response.RoadTripDto;
import com.routefill.security.UserDetailsImpl;
import com.routefill.service.CargoLoadService;
import com.routefill.service.RoadTripService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/cargo-loads")
@RequiredArgsConstructor
public class CargoLoadController {
    private final CargoLoadService cargoLoadService;
    private final RoadTripService roadTripService;

    @PostMapping
    public ResponseEntity<ApiResponse<CargoLoadDto>> createLoad(
            @AuthenticationPrincipal UserDetailsImpl user,
            @Valid @RequestBody CreateCargoLoadRequest req) {
        CargoLoadDto load = cargoLoadService.createLoad(user.getId(), req);
        return ResponseEntity.ok(ApiResponse.success(load));
    }

    @GetMapping("/open")
    public ResponseEntity<ApiResponse<List<CargoLoadDto>>> getOpenLoads() {
        return ResponseEntity.ok(ApiResponse.success(cargoLoadService.getOpenLoads()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CargoLoadDto>> getLoad(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(cargoLoadService.getLoad(id)));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<CargoLoadDto>> publishLoad(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(cargoLoadService.publishLoad(id)));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelLoad(@PathVariable String id) {
        cargoLoadService.cancelLoad(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/{id}/matches")
    public ResponseEntity<ApiResponse<List<RoadTripDto>>> findMatchesForLoad(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(roadTripService.findMatchesForLoad(id)));
    }
}
