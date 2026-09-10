package com.routefill.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class KycDecisionRequest {
    @NotBlank
    private String decision; // verified / rejected
    private String note;
}
