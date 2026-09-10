package com.routefill.dto.response;

import lombok.*;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadTripDto {
    private String id;
    private String driverId;
    private String origin;
    private String destination;
    private String vehicleType;
    private String unit;
    private Double totalCapacityTons;
    private Double existingLoadTons;
    private Double bookedTons;
    private Double availableBackhaulTons;
    private Double remainingTons;
    private Double capacityTons; // legacy alias
    private Double minPrice;
    private String availableDate;
    private String status;
    private String createdAt;

    // Optional fields when match-scored
    private Integer matchScore;
    private Map<String, Integer> matchBreakdown;
    private Double detourKm;
    private Boolean fits;
    private List<String> reasons;
}
