package com.routefill.dto.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SubmitBillRequest {
    private Double freightAmount;
    private Double tollCharges = 0.0;
    private Double otherCharges = 0.0;
}
