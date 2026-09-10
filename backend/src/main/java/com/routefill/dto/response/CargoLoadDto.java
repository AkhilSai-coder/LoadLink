package com.routefill.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CargoLoadDto {
    private String id;
    private String customerId;
    private String material;
    private Double weightTons;
    private String unit;
    private String origin;
    private String destination;
    private String pickupDate;
    private Double budget;
    private String notes;
    private String status;
    private String matchId;
    private String createdAt;
}
