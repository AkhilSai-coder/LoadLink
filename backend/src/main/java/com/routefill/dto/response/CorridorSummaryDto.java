package com.routefill.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CorridorSummaryDto {
    private String label;
    private String origin;
    private String destination;
    private int activeVehicles;
    private double availableCapacity;
    private int activeRequests;
    private int avgSaving;
    private boolean estimated;
}
