package com.routefill.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BookingRequestDto {
    @NotBlank
    private String loadId;

    @NotBlank
    private String capacityId;

    private Double price;
}
