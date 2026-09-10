package com.routefill.dto.response;

import lombok.*;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriverTrustDto {
    private String driverId;
    private int score;
    private Map<String, Boolean> verified;
    private int completedRoadTrips;
    private int successfulDeliveries;
    private int onTimeRate;
    private int cancellationRate;
    private double customerRating;
}
