package com.routefill.ai;

import com.routefill.entity.CargoLoad;
import com.routefill.entity.RoadTrip;
import org.springframework.stereotype.Service;

@Service
public class RiskAnalysisService {

    public AnalysisResult evaluateRisk(CargoLoad load, RoadTrip trip) {
        if (load.getWeightTons() > trip.getRemainingTons()) {
            return AnalysisResult.autoReject("Requested cargo weight (" + load.getWeightTons() + load.getUnit()
                    + ") exceeds available unused vehicle capacity (" + trip.getRemainingTons() + trip.getUnit() + ").", null);
        }
        return AnalysisResult.approve(100, "Risk analysis passed. Request is safe for driver review.", null);
    }
}
