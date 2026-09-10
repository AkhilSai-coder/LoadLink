package com.routefill.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.routefill.entity.AiAnalysisLog;
import com.routefill.entity.CargoLoad;
import com.routefill.entity.RoadTrip;
import com.routefill.enums.AnalysisType;
import com.routefill.repository.AiAnalysisLogRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnalysisEngine {
    private static final Logger logger = LoggerFactory.getLogger(AnalysisEngine.class);

    private final LoadValidationService loadValidationService;
    private final DriverValidationService driverValidationService;
    private final MatchAnalysisService matchAnalysisService;
    private final RiskAnalysisService riskAnalysisService;
    private final AiAnalysisLogRepository aiAnalysisLogRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AnalysisResult analyzeBookingRequest(CargoLoad load, RoadTrip trip) {
        // Step 1: Validate Cargo Load
        AnalysisResult loadCheck = loadValidationService.validateLoad(load);
        if (loadCheck.getDecision() != com.routefill.enums.AnalysisDecision.APPROVED_FOR_DRIVER_REVIEW) {
            logAnalysis("CARGO_LOAD", load.getId(), AnalysisType.LOAD_VALIDATION, loadCheck);
            return loadCheck;
        }

        // Step 2: Risk / Capacity consistency check
        AnalysisResult riskCheck = riskAnalysisService.evaluateRisk(load, trip);
        if (riskCheck.getDecision() != com.routefill.enums.AnalysisDecision.APPROVED_FOR_DRIVER_REVIEW) {
            logAnalysis("BOOKING_REQUEST", load.getId() + "_" + trip.getId(), AnalysisType.CAPACITY_CHECK, riskCheck);
            return riskCheck;
        }

        // Step 3: Match scoring
        MatchScoreResult matchResult = matchAnalysisService.computeMatchScore(load, trip);
        AnalysisResult matchScoreDecision = AnalysisResult.approve(
                matchResult.getScore(),
                "Route, capacity and departure timing are compatible (" + matchResult.getScore() + "% ROUTEFILL Match).",
                java.util.Map.of("breakdown", matchResult.getBreakdown(), "reasons", matchResult.getReasons())
        );

        logAnalysis("BOOKING_REQUEST", load.getId() + "_" + trip.getId(), AnalysisType.MATCH_ANALYSIS, matchScoreDecision);
        return matchScoreDecision;
    }

    private void logAnalysis(String entityType, String entityId, AnalysisType type, AnalysisResult result) {
        try {
            String detailsJson = result.getDetails() != null ? objectMapper.writeValueAsString(result.getDetails()) : "{}";
            AiAnalysisLog log = AiAnalysisLog.builder()
                    .id("ai_" + UUID.randomUUID().toString().substring(0, 8))
                    .entityType(entityType)
                    .entityId(entityId)
                    .analysisType(type)
                    .decision(result.getDecision())
                    .score(result.getScore())
                    .confidence(result.getConfidence())
                    .reason(result.getReason())
                    .analysisDetailsJson(detailsJson)
                    .build();
            aiAnalysisLogRepository.save(log);
        } catch (Exception e) {
            logger.warn("Failed to persist AI analysis log: {}", e.getMessage());
        }
    }
}
