package com.routefill.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoadTripRequest {
    @NotBlank
    private String origin;

    @NotBlank
    private String destination;

    private String vehicleType;
    private String unit = "T";

    @NotNull
    private Double totalCapacityTons;

    private Double existingLoadTons = 0.0;
    private String availableDate;

    @NotNull
    private Double minPrice;
}
