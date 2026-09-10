package com.routefill.ai;

import lombok.*;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchScoreResult {
    private int score;
    private Map<String, Integer> breakdown;
    private double detourKm;
    private boolean fits;
    private List<String> reasons;
    private int driverTrustScore;
}
