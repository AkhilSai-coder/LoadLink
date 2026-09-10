package com.routefill.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadCorridorOpportunityDto {
    private String corridor;
    private String demandLevel;
    private int activeRequests;
    private double unusedDemandTons;
    private double earningLow;
    private double earningHigh;
    private int opportunityScore;
    private boolean estimated;
}
