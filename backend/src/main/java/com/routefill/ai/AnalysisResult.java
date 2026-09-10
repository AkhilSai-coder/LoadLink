package com.routefill.ai;

import com.routefill.enums.AnalysisDecision;
import lombok.*;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalysisResult {
    private AnalysisDecision decision;
    private int score;
    private int confidence;
    private String reason;
    private Map<String, Object> details;

    public static AnalysisResult approve(int score, String reason, Map<String, Object> details) {
        return AnalysisResult.builder()
                .decision(AnalysisDecision.APPROVED_FOR_DRIVER_REVIEW)
                .score(score)
                .confidence(100)
                .reason(reason)
                .details(details)
                .build();
    }

    public static AnalysisResult autoReject(String reason, Map<String, Object> details) {
        return AnalysisResult.builder()
                .decision(AnalysisDecision.AUTO_REJECTED)
                .score(0)
                .confidence(100)
                .reason(reason)
                .details(details)
                .build();
    }

    public static AnalysisResult flag(int score, String reason, Map<String, Object> details) {
        return AnalysisResult.builder()
                .decision(AnalysisDecision.FLAGGED_FOR_ADMIN_REVIEW)
                .score(score)
                .confidence(85)
                .reason(reason)
                .details(details)
                .build();
    }
}
