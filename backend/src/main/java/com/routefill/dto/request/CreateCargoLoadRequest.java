package com.routefill.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateCargoLoadRequest {
    @NotBlank
    private String material;

    @NotNull
    private Double weightTons;

    private String unit = "T";

    @NotBlank
    private String origin;

    @NotBlank
    private String destination;

    private String pickupDate;

    @NotNull
    private Double budget;

    private String notes;
    private boolean saveAsDraft;
}
