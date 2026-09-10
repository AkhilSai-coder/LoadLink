package com.routefill.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RaiseDisputeRequest {
    @NotBlank
    private String reason;
}
