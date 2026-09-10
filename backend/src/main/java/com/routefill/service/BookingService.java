package com.routefill.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.routefill.ai.AnalysisEngine;
import com.routefill.ai.AnalysisResult;
import com.routefill.ai.MatchAnalysisService;
import com.routefill.ai.MatchScoreResult;
import com.routefill.dto.request.BookingRequestDto;
import com.routefill.dto.response.BookingResponseDto;
import com.routefill.entity.*;
import com.routefill.enums.AnalysisDecision;
import com.routefill.enums.BookingStatus;
import com.routefill.enums.LoadStatus;
import com.routefill.enums.TrackingEventType;
import com.routefill.exception.BadRequestException;
import com.routefill.exception.CapacityExceededException;
import com.routefill.exception.InvalidStatusTransitionException;
import com.routefill.exception.ResourceNotFoundException;
import com.routefill.mapper.EntityDtoMapper;
import com.routefill.repository.*;
import com.routefill.validation.StatusTransitionValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {
    private final BookingRequestRepository bookingRequestRepository;
    private final CargoLoadRepository cargoLoadRepository;
    private final RoadTripRepository roadTripRepository;
    private final RoadConsignmentRepository roadConsignmentRepository;
    private final ProofOfDeliveryRepository proofOfDeliveryRepository;
    private final TrackingEventRepository trackingEventRepository;
    private final AnalysisEngine analysisEngine;
    private final MatchAnalysisService matchAnalysisService;
    private final StatusTransitionValidator statusTransitionValidator;
    private final EntityDtoMapper mapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public BookingResponseDto requestBooking(BookingRequestDto req) {
        CargoLoad load = cargoLoadRepository.findById(req.getLoadId())
                .orElseThrow(() -> new ResourceNotFoundException("Cargo load not found"));
        RoadTrip trip = roadTripRepository.findById(req.getCapacityId())
                .orElseThrow(() -> new ResourceNotFoundException("Road trip not found"));

        if (load.getWeightTons() > trip.getRemainingTons()) {
            throw new CapacityExceededException("This shipment (" + load.getWeightTons() + load.getUnit()
                    + ") no longer fits the remaining vehicle capacity (" + trip.getRemainingTons() + trip.getUnit() + ").");
        }

        AnalysisResult analysis = analysisEngine.analyzeBookingRequest(load, trip);
        if (analysis.getDecision() == AnalysisDecision.AUTO_REJECTED) {
            throw new BadRequestException("AI Auto-Rejected: " + analysis.getReason());
        }

        MatchScoreResult scoring = matchAnalysisService.computeMatchScore(load, trip);

        String bookingId = "mt_" + UUID.randomUUID().toString().substring(0, 8);
        double price = req.getPrice() != null && req.getPrice() > 0 ? req.getPrice()
                : (trip.getMinPrice() != null ? trip.getMinPrice() : load.getBudget());

        String reasonsJson = "[]";
        try {
            reasonsJson = objectMapper.writeValueAsString(scoring.getReasons());
        } catch (Exception ignored) {}

        BookingRequest booking = BookingRequest.builder()
                .id(bookingId)
                .load(load)
                .roadTrip(trip)
                .customer(load.getCustomer())
                .driver(trip.getDriver())
                .weightTons(load.getWeightTons())
                .unit(load.getUnit() != null ? load.getUnit() : trip.getUnit())
                .price(price)
                .status(BookingStatus.PENDING_DRIVER_REVIEW)
                .matchScore(scoring.getScore())
                .routeScore(scoring.getBreakdown().get("route"))
                .capacityScore(scoring.getBreakdown().get("capacity"))
                .timeScore(scoring.getBreakdown().get("time"))
                .detourScore(scoring.getBreakdown().get("detour"))
                .vehicleScore(scoring.getBreakdown().get("vehicle"))
                .reliabilityScore(scoring.getBreakdown().get("reliability"))
                .detourKm(scoring.getDetourKm())
                .reasonsJson(reasonsJson)
                .build();

        bookingRequestRepository.save(booking);

        load.setStatus(LoadStatus.REQUESTED);
        load.setMatchId(booking.getId());
        cargoLoadRepository.save(load);

        TrackingEvent event = TrackingEvent.builder()
                .id("ev_" + UUID.randomUUID().toString().substring(0, 8))
                .booking(booking)
                .eventType(TrackingEventType.BOOKING_REQUESTED)
                .actorRole("customer")
                .location(load.getOrigin())
                .build();
        trackingEventRepository.save(event);

        return enrichBooking(booking);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public BookingResponseDto decideBooking(String matchId, String decision, String actorLocation) {
        BookingRequest booking = bookingRequestRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        decision = decision.trim().toLowerCase();
        if ("accepted".equals(decision)) {
            if (!statusTransitionValidator.canTransition(booking.getStatus(), BookingStatus.ACCEPTED)) {
                throw new InvalidStatusTransitionException("Cannot transition from " + booking.getStatus() + " to ACCEPTED");
            }

            // Concurrency-safe: pessimistic write lock on the road trip
            RoadTrip trip = roadTripRepository.findByIdForUpdate(booking.getRoadTrip().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Road trip not found"));

            if (booking.getWeightTons() > trip.getRemainingTons()) {
                throw new CapacityExceededException("Not enough remaining capacity to accept this booking. Requested: "
                        + booking.getWeightTons() + ", Available: " + trip.getRemainingTons());
            }

            // Deduct capacity atomically
            trip.setBookedTons(trip.getBookedTons() + booking.getWeightTons());
            trip.recalculate();
            roadTripRepository.save(trip);

            booking.setStatus(BookingStatus.ACCEPTED);
            bookingRequestRepository.save(booking);

            CargoLoad load = booking.getLoad();
            load.setStatus(LoadStatus.MATCHED);
            cargoLoadRepository.save(load);

            // Auto-generate Digital Road Consignment
            int hash = Math.abs(booking.getId().hashCode());
            String consignmentId = "RF-" + LocalDateTime.now().getYear() + "-" + String.format("%06d", (100000 + (hash % 899999)));
            RoadConsignment consignment = RoadConsignment.builder()
                    .id(consignmentId)
                    .booking(booking)
                    .build();
            roadConsignmentRepository.save(consignment);

            TrackingEvent evAccepted = TrackingEvent.builder()
                    .id("ev_" + UUID.randomUUID().toString().substring(0, 8))
                    .booking(booking)
                    .eventType(TrackingEventType.BOOKING_ACCEPTED)
                    .actorRole("driver")
                    .location(actorLocation != null ? actorLocation : trip.getOrigin())
                    .build();
            trackingEventRepository.save(evAccepted);

            TrackingEvent evDigital = TrackingEvent.builder()
                    .id("ev_" + UUID.randomUUID().toString().substring(0, 8))
                    .booking(booking)
                    .eventType(TrackingEventType.DIGITAL_RECORD_GENERATED)
                    .actorRole("system")
                    .build();
            trackingEventRepository.save(evDigital);

            return enrichBooking(booking);

        } else if ("rejected".equals(decision)) {
            if (!statusTransitionValidator.canTransition(booking.getStatus(), BookingStatus.REJECTED)) {
                throw new InvalidStatusTransitionException("Cannot transition from " + booking.getStatus() + " to REJECTED");
            }

            booking.setStatus(BookingStatus.REJECTED);
            bookingRequestRepository.save(booking);

            CargoLoad load = booking.getLoad();
            load.setStatus(LoadStatus.OPEN);
            load.setMatchId(null);
            cargoLoadRepository.save(load);

            TrackingEvent evRejected = TrackingEvent.builder()
                    .id("ev_" + UUID.randomUUID().toString().substring(0, 8))
                    .booking(booking)
                    .eventType(TrackingEventType.BOOKING_REJECTED)
                    .actorRole("driver")
                    .location(actorLocation)
                    .build();
            trackingEventRepository.save(evRejected);

            return enrichBooking(booking);
        } else {
            throw new BadRequestException("Invalid decision: " + decision + ". Must be 'accepted' or 'rejected'.");
        }
    }

    @Transactional
    public void cancelBooking(String matchId, String by) {
        BookingRequest booking = bookingRequestRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        if (!statusTransitionValidator.canTransition(booking.getStatus(), BookingStatus.CANCELLED)) {
            throw new InvalidStatusTransitionException("This booking can no longer be cancelled.");
        }

        boolean wasAccepted = booking.getStatus() == BookingStatus.ACCEPTED;
        booking.setStatus(BookingStatus.CANCELLED);
        bookingRequestRepository.save(booking);

        if (wasAccepted) {
            RoadTrip trip = roadTripRepository.findByIdForUpdate(booking.getRoadTrip().getId()).orElse(null);
            if (trip != null) {
                trip.setBookedTons(Math.max(0.0, trip.getBookedTons() - booking.getWeightTons()));
                trip.recalculate();
                roadTripRepository.save(trip);
            }
        }

        CargoLoad load = booking.getLoad();
        if (load != null) {
            load.setStatus(LoadStatus.OPEN);
            load.setMatchId(null);
            cargoLoadRepository.save(load);
        }

        TrackingEvent ev = TrackingEvent.builder()
                .id("ev_" + UUID.randomUUID().toString().substring(0, 8))
                .booking(booking)
                .eventType(TrackingEventType.BOOKING_CANCELLED)
                .actorRole(by != null ? by : "customer")
                .build();
        trackingEventRepository.save(ev);
    }

    @Transactional(readOnly = true)
    public List<BookingResponseDto> getMatchesForUser(String userId, String role) {
        List<BookingRequest> list = "driver".equalsIgnoreCase(role)
                ? bookingRequestRepository.findByDriverIdOrderByCreatedAtDesc(userId)
                : bookingRequestRepository.findByCustomerIdOrderByCreatedAtDesc(userId);

        return list.stream().map(this::enrichBooking).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BookingResponseDto getMatch(String id) {
        BookingRequest b = bookingRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + id));
        return enrichBooking(b);
    }

    @Transactional(readOnly = true)
    public BookingResponseDto enrichBooking(BookingRequest b) {
        var consignment = roadConsignmentRepository.findByBookingId(b.getId()).orElse(null);
        var pod = proofOfDeliveryRepository.findByBookingId(b.getId()).orElse(null);
        var events = trackingEventRepository.findByBookingIdOrderByTimestampAsc(b.getId());
        return mapper.toBookingDto(b, consignment, pod, events);
    }
}
