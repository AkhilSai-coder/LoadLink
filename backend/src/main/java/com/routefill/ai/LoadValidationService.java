package com.routefill.ai;

import com.routefill.entity.CargoLoad;
import org.springframework.stereotype.Service;

@Service
public class LoadValidationService {

    public AnalysisResult validateLoad(CargoLoad load) {
        if (load.getWeightTons() == null || load.getWeightTons() <= 0) {
            return AnalysisResult.autoReject("Cargo weight must be strictly greater than zero.", null);
        }
        if (load.getOrigin() == null || load.getDestination() == null) {
            return AnalysisResult.autoReject("Origin and destination road locations are required.", null);
        }
        String originCity = load.getOrigin().split(",")[0].trim().toLowerCase();
        String destCity = load.getDestination().split(",")[0].trim().toLowerCase();
        if (originCity.equalsIgnoreCase(destCity)) {
            return AnalysisResult.autoReject("Pickup and destination locations cannot be the same city.", null);
        }
        if (load.getBudget() == null || load.getBudget() <= 0) {
            return AnalysisResult.autoReject("A valid budget amount is required for road freight booking.", null);
        }
        return AnalysisResult.approve(100, "Cargo load passed initial road freight validation.", null);
    }
}
