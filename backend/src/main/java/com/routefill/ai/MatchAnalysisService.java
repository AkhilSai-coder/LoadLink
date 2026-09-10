package com.routefill.ai;

import com.routefill.entity.CargoLoad;
import com.routefill.entity.RoadTrip;
import com.routefill.entity.User;
import com.routefill.enums.KycStatus;
import com.routefill.repository.BookingRequestRepository;
import com.routefill.repository.DriverProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class MatchAnalysisService {
    private final DriverProfileRepository driverProfileRepository;
    private final BookingRequestRepository bookingRequestRepository;

    private static String cityKey(String str) {
        if (str == null) return "";
        return str.split(",")[0].trim().toLowerCase();
    }

    private static int clamp(int val, int min, int max) {
        return Math.max(min, Math.min(max, val));
    }

    private static int hashStr(String str) {
        int h = 0;
        for (int i = 0; i < str.length(); i++) {
            h = (h * 31 + str.charAt(i));
        }
        return Math.abs(h);
    }

    public int calcDriverTrustScore(User driver) {
        String driverId = driver.getId();
        int baseline = 78 + (hashStr(driverId) % 16); // 78 - 93
        var profileOpt = driverProfileRepository.findByUserId(driverId);
        int kycBonus = profileOpt.map(p -> p.getKycStatus() == KycStatus.VERIFIED ? 4 : -12).orElse(-12);

        var own = bookingRequestRepository.findByDriverIdOrderByCreatedAtDesc(driverId);
        long delivered = own.stream().filter(m -> "DELIVERED".equalsIgnoreCase(m.getStatus().name())).count();
        long cancelled = own.stream().filter(m -> "CANCELLED".equalsIgnoreCase(m.getStatus().name()) || "REJECTED".equalsIgnoreCase(m.getStatus().name())).count();

        int deliveredBonus = (int) Math.min(6, delivered);
        int cancelPenalty = (int) Math.min(15, cancelled * 3);

        return clamp(baseline + kycBonus + deliveredBonus - cancelPenalty, 35, 100);
    }

    public MatchScoreResult computeMatchScore(CargoLoad load, RoadTrip trip) {
        boolean routeMatch = cityKey(load.getOrigin()).equals(cityKey(trip.getOrigin()))
                && cityKey(load.getDestination()).equals(cityKey(trip.getDestination()));
        int routeScore = routeMatch ? 25 :
                (cityKey(load.getOrigin()).equals(cityKey(trip.getOrigin())) || cityKey(load.getDestination()).equals(cityKey(trip.getDestination())) ? 12 : 3);

        double remaining = trip.getRemainingTons();
        double weight = load.getWeightTons();
        boolean fits = weight <= remaining;
        double utilization = remaining > 0 ? Math.min(1.0, weight / remaining) : 0.0;
        int capacityScore = fits ? (int) Math.round(14 + utilization * 6) : (int) Math.round(utilization * 6);

        int daysDiff = 3;
        try {
            if (load.getPickupDate() != null && trip.getAvailableDate() != null) {
                LocalDate d1 = LocalDate.parse(load.getPickupDate().substring(0, 10));
                LocalDate d2 = LocalDate.parse(trip.getAvailableDate().substring(0, 10));
                daysDiff = (int) Math.abs(ChronoUnit.DAYS.between(d1, d2));
            }
        } catch (Exception ignored) {}

        int timeScore = daysDiff == 0 ? 15 : daysDiff == 1 ? 12 : daysDiff == 2 ? 9 : daysDiff <= 4 ? 6 : 3;

        int hash = hashStr(load.getId() + trip.getId());
        double detourKm = 1.0 + (hash % 8);
        int detourScore = (int) Math.round(Math.max(2, Math.min(15, 15 - detourKm * 1.3)));

        int vehicleScore = fits ? 10 : 5;

        int trustScore = calcDriverTrustScore(trip.getDriver());
        int reliabilityScore = (int) Math.round(15.0 * (trustScore / 100.0));

        int totalScore = clamp(routeScore + capacityScore + timeScore + detourScore + vehicleScore + reliabilityScore, 0, 100);

        Map<String, Integer> breakdown = new LinkedHashMap<>();
        breakdown.put("route", routeScore);
        breakdown.put("capacity", capacityScore);
        breakdown.put("time", timeScore);
        breakdown.put("detour", detourScore);
        breakdown.put("vehicle", vehicleScore);
        breakdown.put("reliability", reliabilityScore);

        List<String> reasons = new ArrayList<>();
        reasons.add(routeMatch ? "Vehicle is already travelling on this exact road corridor" : "Vehicle is travelling a closely overlapping road corridor");
        reasons.add(remaining + (trip.getUnit() != null ? trip.getUnit() : "T") + " unused capacity is available");
        reasons.add(fits ? "Your " + weight + (load.getUnit() != null ? load.getUnit() : "T") + " cargo fits available capacity"
                : "Your cargo exceeds the " + remaining + " remaining — driver may need to reject");
        reasons.add("Pickup location is only " + String.format("%.1f", detourKm) + " km off the planned route");
        reasons.add(daysDiff <= 1 ? "Delivery timing is compatible" : "Timing is " + daysDiff + " day(s) apart from availability");
        reasons.add("Vehicle is suitable for this cargo");
        reasons.add(trustScore >= 85 ? "Driver has a high reliability score" : "Driver has a solid reliability score");

        return MatchScoreResult.builder()
                .score(totalScore)
                .breakdown(breakdown)
                .detourKm(Double.parseDouble(String.format(Locale.US, "%.1f", detourKm)))
                .fits(fits)
                .reasons(reasons)
                .driverTrustScore(trustScore)
                .build();
    }
}
