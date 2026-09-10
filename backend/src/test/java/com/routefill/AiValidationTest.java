package com.routefill;

import com.routefill.ai.LoadValidationService;
import com.routefill.ai.AnalysisResult;
import com.routefill.entity.CargoLoad;
import com.routefill.enums.AnalysisDecision;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class AiValidationTest {
    private final LoadValidationService loadValidationService = new LoadValidationService();

    @Test
    void testNegativeWeightAutoRejected() {
        CargoLoad invalidLoad = CargoLoad.builder()
                .weightTons(-5.0)
                .origin("Vijayawada, AP")
                .destination("Hyderabad, TS")
                .budget(3000.0)
                .build();

        AnalysisResult result = loadValidationService.validateLoad(invalidLoad);
        assertEquals(AnalysisDecision.AUTO_REJECTED, result.getDecision());
        assertTrue(result.getReason().contains("strictly greater than zero"));
    }

    @Test
    void testSameOriginDestinationAutoRejected() {
        CargoLoad invalidLoad = CargoLoad.builder()
                .weightTons(200.0)
                .origin("Hyderabad, TS")
                .destination("Hyderabad, TS")
                .budget(3000.0)
                .build();

        AnalysisResult result = loadValidationService.validateLoad(invalidLoad);
        assertEquals(AnalysisDecision.AUTO_REJECTED, result.getDecision());
        assertTrue(result.getReason().contains("cannot be the same city"));
    }
}
