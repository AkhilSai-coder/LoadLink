package com.routefill.service;

import com.routefill.ai.MatchAnalysisService;
import com.routefill.ai.MatchScoreResult;
import com.routefill.dto.request.CreateRoadTripRequest;
import com.routefill.dto.response.CapacityUtilizationDto;
import com.routefill.dto.response.RoadCorridorOpportunityDto;
import com.routefill.dto.response.RoadTripDto;
import com.routefill.entity.CargoLoad;
import com.routefill.entity.RoadTrip;
import com.routefill.entity.User;
import com.routefill.enums.LoadStatus;
import com.routefill.enums.TripStatus;
import com.routefill.exception.BadRequestException;
import com.routefill.exception.ResourceNotFoundException;
import com.routefill.mapper.EntityDtoMapper;
import com.routefill.repository.BookingRequestRepository;
import com.routefill.repository.CargoLoadRepository;
import com.routefill.repository.RoadTripRepository;
import com.routefill.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoadTripService {
    private final RoadTripRepository roadTripRepository;
    private final CargoLoadRepository cargoLoadRepository;
    private final BookingRequestRepository bookingRequestRepository;
    private final UserRepository userRepository;
    private final MatchAnalysisService matchAnalysisService;
    private final EntityDtoMapper mapper;

    private static String cityKey(String str) {
        if (str == null) return "";
        return str.split(",")[0].trim().toLowerCase();
    }

    public List<RoadTripDto> getTripsByDriver(String driverId) {
        return roadTripRepository.findByDriverIdOrderByCreatedAtDesc(driverId)
                .stream().map(mapper::toRoadTripDto).collect(Collectors.toList());
    }

    public List<RoadTripDto> getOpenCapacities() {
        return roadTripRepository.findOpenCapacities()
                .stream().map(mapper::toRoadTripDto).collect(Collectors.toList());
    }

    public RoadTripDto getTrip(String id) {
        RoadTrip trip = roadTripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Road trip not found with id: " + id));
        return mapper.toRoadTripDto(trip);
    }

    @Transactional
    public RoadTripDto createRoadTrip(String driverId, CreateRoadTripRequest req) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new BadRequestException("Driver not found"));

        double total = req.getTotalCapacityTons();
        double existing = req.getExistingLoadTons() != null ? req.getExistingLoadTons() : 0.0;
        if (existing > total) {
            throw new BadRequestException("Existing cargo load cannot exceed total capacity.");
        }

        String tripId = "cp_" + UUID.randomUUID().toString().substring(0, 8);
        RoadTrip trip = RoadTrip.builder()
                .id(tripId)
                .driver(driver)
                .origin(req.getOrigin().trim())
                .destination(req.getDestination().trim())
                .vehicleType(req.getVehicleType())
                .unit(req.getUnit() != null ? req.getUnit() : "T")
                .totalCapacityTons(total)
                .existingLoadTons(existing)
                .bookedTons(0.0)
                .availableDate(req.getAvailableDate())
                .minPrice(req.getMinPrice())
                .status(TripStatus.OPEN)
                .build();
        trip.recalculate();

        roadTripRepository.save(trip);
        return mapper.toRoadTripDto(trip);
    }

    public List<RoadTripDto> findMatchesForLoad(String loadId) {
        CargoLoad load = cargoLoadRepository.findById(loadId)
                .orElseThrow(() -> new ResourceNotFoundException("Cargo load not found"));

        return roadTripRepository.findOpenCapacities().stream()
                .filter(t -> t.getRemainingTons() > 0 &&
                        cityKey(t.getOrigin()).equals(cityKey(load.getOrigin())) &&
                        cityKey(t.getDestination()).equals(cityKey(load.getDestination())))
                .map(t -> {
                    MatchScoreResult score = matchAnalysisService.computeMatchScore(load, t);
                    RoadTripDto dto = mapper.toRoadTripDto(t);
                    dto.setMatchScore(score.getScore());
                    dto.setMatchBreakdown(score.getBreakdown());
                    dto.setDetourKm(score.getDetourKm());
                    dto.setFits(score.isFits());
                    dto.setReasons(score.getReasons());
                    return dto;
                })
                .sorted((a, b) -> Integer.compare(b.getMatchScore(), a.getMatchScore()))
                .collect(Collectors.toList());
    }

    public List<CargoLoad> findMatchesForCapacity(String tripId) {
        RoadTrip trip = roadTripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Road trip not found"));

        return cargoLoadRepository.findByStatus(LoadStatus.OPEN).stream()
                .filter(l -> cityKey(l.getOrigin()).equals(cityKey(trip.getOrigin())) &&
                        cityKey(l.getDestination()).equals(cityKey(trip.getDestination())) &&
                        l.getWeightTons() <= trip.getRemainingTons())
                .collect(Collectors.toList());
    }

    public CapacityUtilizationDto getCapacityUtilization(String tripId) {
        RoadTrip trip = roadTripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Road trip not found"));

        double total = trip.getTotalCapacityTons() > 0 ? trip.getTotalCapacityTons() : 1.0;
        double before = trip.getExistingLoadTons();
        double after = before + trip.getBookedTons();
        double income = bookingRequestRepository.findByRoadTripId(tripId).stream()
                .filter(b -> List.of("ACCEPTED", "PICKUP_CONFIRMED", "IN_TRANSIT", "ARRIVED", "DELIVERED")
                        .contains(b.getStatus().name()))
                .mapToDouble(b -> b.getPrice() != null ? b.getPrice() : 0.0)
                .sum();

        return CapacityUtilizationDto.builder()
                .unit(trip.getUnit() != null ? trip.getUnit() : "T")
                .total(total)
                .before(before)
                .after(after)
                .utilizationBeforePct((int) Math.round((before / total) * 100))
                .utilizationAfterPct((int) Math.round((after / total) * 100))
                .extraIncome(income)
                .remaining(trip.getRemainingTons())
                .build();
    }

    public RoadCorridorOpportunityDto getRoadCorridorOpportunity(String tripId) {
        RoadTrip trip = roadTripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Road trip not found"));

        String originCity = trip.getOrigin().split(",")[0].trim();
        String destCity = trip.getDestination().split(",")[0].trim();
        List<CargoLoad> compatible = findMatchesForCapacity(tripId);

        int hash = Math.abs((originCity + ">" + destCity).hashCode());
        int demandScore = Math.min(100, (hash % 60) + compatible.size() * 8);
        String demandLevel = demandScore >= 70 ? "HIGH" : demandScore >= 40 ? "MEDIUM" : "LOW";
        int activeRequests = Math.max(compatible.size(), 2 + (hash % 14));
        double unusedDemandTons = 1.5 + (hash % 40) / 10.0;
        double earnLow = Math.round((trip.getMinPrice() * 0.9) / 50.0) * 50;
        double earnHigh = Math.round((trip.getMinPrice() * 1.4) / 50.0) * 50;
        int oppScore = Math.max(0, Math.min(100, demandScore + (trip.getStatus() == TripStatus.OPEN ? 5 : -10)));

        return RoadCorridorOpportunityDto.builder()
                .corridor(originCity + " → " + destCity)
                .demandLevel(demandLevel)
                .activeRequests(activeRequests)
                .unusedDemandTons(Math.round(unusedDemandTons * 10.0) / 10.0)
                .earningLow(earnLow)
                .earningHigh(earnHigh)
                .opportunityScore(oppScore)
                .estimated(true)
                .build();
    }
}
