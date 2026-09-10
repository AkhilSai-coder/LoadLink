package com.routefill.ai;

import com.routefill.entity.DriverProfile;
import com.routefill.entity.RoadTrip;
import org.springframework.stereotype.Service;

@Service
public class DriverValidationService {

    public AnalysisResult validateTrip(RoadTrip trip, DriverProfile profile) {
        if (trip.getTotalCapacityTons() == null || trip.getTotalCapacityTons() <= 0) {
            return AnalysisResult.autoReject("Total vehicle capacity must be greater than zero.", null);
        }
        double total = trip.getTotalCapacityTons();
        double existing = trip.getExistingLoadTons() != null ? trip.getExistingLoadTons() : 0.0;
        if (existing > total) {
            return AnalysisResult.autoReject("Existing cargo load cannot exceed total vehicle capacity.", null);
        }
        if (trip.getMinPrice() == null || trip.getMinPrice() < 0) {
            return AnalysisResult.autoReject("Minimum transport price cannot be negative.", null);
        }
        return AnalysisResult.approve(100, "Road trip capacity profile is consistent.", null);
    }
}
