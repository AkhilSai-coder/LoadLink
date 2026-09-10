package com.routefill.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformStatsDto {
    private double gmv;
    private int totalCustomers;
    private int totalDrivers;
    private int verifiedDrivers;
    private int openLoads;
    private int activeTrips;
    private int completedTrips;
    private int disputesOpen;
}
