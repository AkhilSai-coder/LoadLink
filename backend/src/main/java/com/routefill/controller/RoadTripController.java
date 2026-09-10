package com.routefill.controller;

import com.routefill.dto.request.CreateRoadTripRequest;
import com.routefill.dto.response.ApiResponse;
import com.routefill.dto.response.CapacityUtilizationDto;
import com.routefill.dto.response.RoadCorridorOpportunityDto;
import com.routefill.dto.response.RoadTripDto;
import com.routefill.security.UserDetailsImpl;
import com.routefill.service.RoadTripService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/road-trips")
@RequiredArgsConstructor
public class RoadTripController {
    private final RoadTripService roadTripService;

    @PostMapping
    public ResponseEntity<ApiResponse<RoadTripDto>> createRoadTrip(
            @AuthenticationPrincipal UserDetailsImpl user,
            @Valid @RequestBody CreateRoadTripRequest req) {
        RoadTripDto trip = roadTripService.createRoadTrip(user.getId(), req);
        return ResponseEntity.ok(ApiResponse.success(trip));
    }

    @GetMapping("/open")
    public ResponseEntity<ApiResponse<List<RoadTripDto>>> getOpenCapacities() {
        return ResponseEntity.ok(ApiResponse.success(roadTripService.getOpenCapacities()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RoadTripDto>> getTrip(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(roadTripService.getTrip(id)));
    }

    @GetMapping("/{id}/utilization")
    public ResponseEntity<ApiResponse<CapacityUtilizationDto>> getUtilization(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(roadTripService.getCapacityUtilization(id)));
    }

    @GetMapping("/{id}/opportunity")
    public ResponseEntity<ApiResponse<RoadCorridorOpportunityDto>> getOpportunity(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(roadTripService.getRoadCorridorOpportunity(id)));
    }
}
