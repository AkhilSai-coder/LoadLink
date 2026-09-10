package com.routefill.service;

import com.routefill.dto.response.*;
import com.routefill.entity.*;
import com.routefill.enums.BookingStatus;
import com.routefill.enums.LoadStatus;
import com.routefill.enums.TrackingEventType;
import com.routefill.exception.BadRequestException;
import com.routefill.exception.InvalidStatusTransitionException;
import com.routefill.exception.ResourceNotFoundException;
import com.routefill.repository.*;
import com.routefill.validation.StatusTransitionValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ConsignmentService {
    private final BookingRequestRepository bookingRequestRepository;
    private final CargoLoadRepository cargoLoadRepository;
    private final RoadConsignmentRepository roadConsignmentRepository;
    private final ProofOfDeliveryRepository proofOfDeliveryRepository;
    private final TrackingEventRepository trackingEventRepository;
    private final StatusTransitionValidator statusTransitionValidator;
    private final BookingService bookingService;

    @Transactional
    public BookingResponseDto confirmPickup(String matchId, String location) {
        return advanceTrip(matchId, BookingStatus.PICKUP_CONFIRMED, TrackingEventType.PICKUP_CONFIRMED, "driver", location);
    }

    @Transactional
    public BookingResponseDto startTransit(String matchId, String location) {
        return advanceTrip(matchId, BookingStatus.IN_TRANSIT, TrackingEventType.IN_TRANSIT, "driver", location);
    }

    @Transactional
    public BookingResponseDto markArrived(String matchId, String location) {
        return advanceTrip(matchId, BookingStatus.ARRIVED, TrackingEventType.ARRIVED, "driver", location);
    }

    @Transactional
    public BookingResponseDto advanceTrip(String matchId, BookingStatus toStatus, TrackingEventType eventType, String actor, String location) {
        BookingRequest booking = bookingRequestRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        if (!statusTransitionValidator.canTransition(booking.getStatus(), toStatus)) {
            throw new InvalidStatusTransitionException("Cannot move from " + booking.getStatus() + " to " + toStatus);
        }

        booking.setStatus(toStatus);
        bookingRequestRepository.save(booking);

        TrackingEvent event = TrackingEvent.builder()
                .id("ev_" + UUID.randomUUID().toString().substring(0, 8))
                .booking(booking)
                .eventType(eventType)
                .actorRole(actor)
                .location(location)
                .build();
        trackingEventRepository.save(event);

        CargoLoad load = booking.getLoad();
        if (load != null && toStatus == BookingStatus.IN_TRANSIT) {
            load.setStatus(LoadStatus.IN_TRANSIT);
            cargoLoadRepository.save(load);
        }

        return bookingService.enrichBooking(booking);
    }

    @Transactional
    public String initiateDelivery(String matchId) {
        BookingRequest booking = bookingRequestRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        if (booking.getStatus() != BookingStatus.ARRIVED) {
            throw new BadRequestException("Mark the shipment arrived before generating a delivery OTP.");
        }

        // Generate permanent POD ID
        int hash = Math.abs(matchId.hashCode());
        String podId = "POD-RF-" + LocalDateTime.now().getYear() + "-" + String.format("%06d", (100000 + (hash % 899999)));
        String otp = String.format("%04d", 1000 + (new Random().nextInt(9000)));

        ProofOfDelivery pod = proofOfDeliveryRepository.findByBookingId(matchId)
                .orElseGet(() -> ProofOfDelivery.builder()
                        .id(podId)
                        .booking(booking)
                        .build());

        pod.setOtp(otp);
        pod.setOtpVerified(false);
        proofOfDeliveryRepository.save(pod);

        return otp;
    }

    @Transactional
    public BookingResponseDto verifyDeliveryOtp(String matchId, String otp, String receiverName) {
        BookingRequest booking = bookingRequestRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        ProofOfDelivery pod = proofOfDeliveryRepository.findByBookingId(matchId)
                .orElseThrow(() -> new BadRequestException("No OTP has been generated for this delivery yet."));

        if (otp == null || !otp.trim().equals(pod.getOtp())) {
            throw new BadRequestException("Incorrect OTP. Please try again.");
        }

        if (!statusTransitionValidator.canTransition(booking.getStatus(), BookingStatus.DELIVERED)) {
            throw new InvalidStatusTransitionException("Cannot deliver from status " + booking.getStatus());
        }

        pod.setOtpVerified(true);
        pod.setDeliveryTime(LocalDateTime.now());
        pod.setDeliveryLocation(booking.getLoad() != null ? booking.getLoad().getDestination() : null);
        pod.setReceiverName(receiverName != null ? receiverName : (booking.getCustomer() != null ? booking.getCustomer().getName() : "Receiver"));
        proofOfDeliveryRepository.save(pod);

        booking.setStatus(BookingStatus.DELIVERED);
        bookingRequestRepository.save(booking);

        CargoLoad load = booking.getLoad();
        if (load != null) {
            load.setStatus(LoadStatus.DELIVERED);
            cargoLoadRepository.save(load);
        }

        TrackingEvent evPod = TrackingEvent.builder()
                .id("ev_" + UUID.randomUUID().toString().substring(0, 8))
                .booking(booking)
                .eventType(TrackingEventType.POD_GENERATED)
                .actorRole("system")
                .location(pod.getDeliveryLocation())
                .build();
        trackingEventRepository.save(evPod);

        TrackingEvent evDelivered = TrackingEvent.builder()
                .id("ev_" + UUID.randomUUID().toString().substring(0, 8))
                .booking(booking)
                .eventType(TrackingEventType.DELIVERED)
                .actorRole("driver")
                .location(pod.getDeliveryLocation())
                .build();
        trackingEventRepository.save(evDelivered);

        return bookingService.enrichBooking(booking);
    }

    @Transactional(readOnly = true)
    public DigitalRecordDto getDigitalRecord(String bookingId) {
        BookingRequest booking = bookingRequestRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        RoadConsignment rc = roadConsignmentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Digital Record not found for booking: " + bookingId));

        return DigitalRecordDto.builder()
                .consignmentId(rc.getId())
                .bookingId(booking.getId())
                .customer(booking.getCustomer().getName())
                .driver(booking.getDriver().getName())
                .vehicle(booking.getRoadTrip() != null ? booking.getRoadTrip().getVehicleType() : "")
                .goods(booking.getLoad() != null ? booking.getLoad().getMaterial() : "")
                .weight(booking.getWeightTons() + (booking.getUnit() != null ? booking.getUnit() : "T"))
                .pickup(booking.getLoad() != null ? booking.getLoad().getOrigin() : "")
                .drop(booking.getLoad() != null ? booking.getLoad().getDestination() : "")
                .price(booking.getPrice())
                .createdAt(rc.getCreatedAt().toString())
                .status(booking.getStatus().name().toLowerCase())
                .disclaimer(rc.getDisclaimer())
                .build();
    }

    @Transactional(readOnly = true)
    public PodDto getPOD(String bookingId) {
        ProofOfDelivery pod = proofOfDeliveryRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("POD not found"));
        RoadConsignment rc = roadConsignmentRepository.findByBookingId(bookingId).orElse(null);
        BookingRequest b = pod.getBooking();

        return PodDto.builder()
                .podId(pod.getId())
                .consignmentId(rc != null ? rc.getId() : null)
                .otp(pod.getOtp())
                .otpVerified(pod.getOtpVerified())
                .deliveryTime(pod.getDeliveryTime() != null ? pod.getDeliveryTime().toString() : null)
                .deliveryLocation(pod.getDeliveryLocation())
                .receiverName(pod.getReceiverName())
                .driver(b.getDriver().getName())
                .vehicle(b.getRoadTrip() != null ? b.getRoadTrip().getVehicleType() : "")
                .build();
    }

    @Transactional(readOnly = true)
    public TrackingDto trackConsignment(String consignmentId) {
        String cleanId = consignmentId.trim().toUpperCase();
        RoadConsignment rc = roadConsignmentRepository.findById(cleanId)
                .orElseThrow(() -> new ResourceNotFoundException("Consignment not found with ID: " + cleanId));

        BookingRequest booking = rc.getBooking();
        CargoLoad load = booking.getLoad();
        String originCity = load != null ? load.getOrigin().split(",")[0].trim() : "";
        String destCity = load != null ? load.getDestination().split(",")[0].trim() : "";

        int hash = Math.abs(booking.getId().hashCode());
        String midpoint = List.of("En route waypoint", "Highway checkpoint", "Midway stop").get(hash % 3);

        String statusStr = booking.getStatus().name().toLowerCase();
        int stageIndex = List.of("pending_driver_review", "requested", "accepted").contains(statusStr) ? 0 :
                List.of("pickup_confirmed", "in_transit").contains(statusStr) ? 1 : 2;

        int etaHours = "delivered".equals(statusStr) ? 0 : 2 + (hash % 6);

        Map<String, String> statusLabels = Map.of(
                "requested", "REQUESTED",
                "pending_driver_review", "REQUESTED",
                "accepted", "ACCEPTED",
                "pickup_confirmed", "PICKUP CONFIRMED",
                "in_transit", "ON THE ROAD",
                "arrived", "NEAR DESTINATION",
                "delivered", "DELIVERED"
        );

        List<TrackingEventDto> events = new ArrayList<>();
        trackingEventRepository.findByBookingIdOrderByTimestampAsc(booking.getId()).forEach(e ->
                events.add(TrackingEventDto.builder()
                        .type(e.getEventType().name())
                        .timestamp(e.getTimestamp().toString())
                        .actor(e.getActorRole())
                        .location(e.getLocation())
                        .build()));

        return TrackingDto.builder()
                .consignmentId(rc.getId())
                .status(statusStr)
                .statusLabel(statusLabels.getOrDefault(statusStr, statusStr.toUpperCase()))
                .origin(originCity)
                .destination(destCity)
                .waypoints(List.of(originCity, midpoint, destCity))
                .currentStageIndex(stageIndex)
                .vehicleType(booking.getRoadTrip() != null ? booking.getRoadTrip().getVehicleType() : "")
                .etaHours(etaHours)
                .simulated(true)
                .events(events)
                .build();
    }
}
