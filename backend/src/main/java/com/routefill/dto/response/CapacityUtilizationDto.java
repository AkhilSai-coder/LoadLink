package com.routefill.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CapacityUtilizationDto {
    private String unit;
    private double total;
    private double before;
    private double after;
    private int utilizationBeforePct;
    private int utilizationAfterPct;
    private double extraIncome;
    private double remaining;
}
