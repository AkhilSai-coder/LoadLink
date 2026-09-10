package com.routefill.dto.request;

import lombok.*;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RateTripRequest {
    private String raterRole; // customer / driver
    private Map<String, Object> ratings;
    private String review;
}
