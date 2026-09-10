package com.routefill.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillDto {
    private String id;
    private String matchId;
    private Double freightAmount;
    private Double tollCharges;
    private Double otherCharges;
    private Double totalAmount;
    private String status;
    private String submittedBy;
    private String createdAt;
    private BookingResponseDto match;
}
