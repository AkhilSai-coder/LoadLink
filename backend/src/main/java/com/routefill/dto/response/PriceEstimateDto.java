package com.routefill.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceEstimateDto {
    private double traditional;
    private double routefill;
    private double savings;
    private int savingsPct;
    private boolean estimated;
}
