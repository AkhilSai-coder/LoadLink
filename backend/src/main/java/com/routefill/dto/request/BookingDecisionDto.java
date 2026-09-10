package com.routefill.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BookingDecisionDto {
    @NotBlank
    private String decision; // accepted / rejected
    private String actorLocation;
}
