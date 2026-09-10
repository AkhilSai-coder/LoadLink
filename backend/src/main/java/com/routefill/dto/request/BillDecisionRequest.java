package com.routefill.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BillDecisionRequest {
    @NotBlank
    private String decision; // approved / rejected
}
