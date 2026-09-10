package com.routefill.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImpactDto {
    private Double additionalIncome;
    private Double unusedCapacityUtilizedTons;
    private Integer roadTripsWithAdditionalCargo;
    private Double totalSaved;
    private Integer completedConsignments;
    private Double goodsTransportedTons;
    private Integer emptyCapacityUtilizedPct;
    private Integer estimatedEmptyDistanceAvoidedKm;
    private Double driverAdditionalIncome;
    private Double customerSavings;
    private boolean estimated;
}
