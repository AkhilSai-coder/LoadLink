package com.routefill.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.routefill.dto.response.*;
import com.routefill.entity.*;
import com.routefill.repository.CustomerProfileRepository;
import com.routefill.repository.DriverProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
@RequiredArgsConstructor
public class EntityDtoMapper {
    private final CustomerProfileRepository customerProfileRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public UserDto toUserDto(User user) {
        if (user == null) return null;
        UserDto.UserDtoBuilder builder = UserDto.builder()
                .id(user.getId())
                .role(user.getRole().name().toLowerCase())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);

        if (user.getRole() == com.routefill.enums.UserRole.CUSTOMER) {
            customerProfileRepository.findByUserId(user.getId())
                    .ifPresent(cp -> builder.company(cp.getCompanyName()));
        } else if (user.getRole() == com.routefill.enums.UserRole.DRIVER) {
            driverProfileRepository.findByUserId(user.getId()).ifPresent(dp -> {
                builder.vehicleType(dp.getVehicleType())
                        .vehicleNumber(dp.getVehicleNumber())
                        .kycStatus(dp.getKycStatus().name().toLowerCase())
                        .kycNote(dp.getKycNote());

                Map<String, String> docs = new HashMap<>();
                if (dp.getLicenseDoc() != null) docs.put("license", dp.getLicenseDoc());
                if (dp.getRcDoc() != null) docs.put("rc", dp.getRcDoc());
                if (dp.getAadhaarDoc() != null) docs.put("aadhaar", dp.getAadhaarDoc());
                builder.kycDocs(docs);
            });
        }
        return builder.build();
    }

    public CargoLoadDto toCargoLoadDto(CargoLoad load) {
        if (load == null) return null;
        return CargoLoadDto.builder()
                .id(load.getId())
                .customerId(load.getCustomer().getId())
                .material(load.getMaterial())
                .weightTons(load.getWeightTons())
                .unit(load.getUnit())
                .origin(load.getOrigin())
                .destination(load.getDestination())
                .pickupDate(load.getPickupDate())
                .budget(load.getBudget())
                .notes(load.getNotes())
                .status(load.getStatus().name().toLowerCase())
                .matchId(load.getMatchId())
                .createdAt(load.getCreatedAt() != null ? load.getCreatedAt().toString() : null)
                .build();
    }

    public RoadTripDto toRoadTripDto(RoadTrip trip) {
        if (trip == null) return null;
        double remaining = trip.getRemainingTons();
        return RoadTripDto.builder()
                .id(trip.getId())
                .driverId(trip.getDriver().getId())
                .origin(trip.getOrigin())
                .destination(trip.getDestination())
                .vehicleType(trip.getVehicleType())
                .unit(trip.getUnit())
                .totalCapacityTons(trip.getTotalCapacityTons())
                .existingLoadTons(trip.getExistingLoadTons())
                .bookedTons(trip.getBookedTons())
                .availableBackhaulTons(trip.getAvailableBackhaulTons())
                .remainingTons(remaining)
                .capacityTons(remaining)
                .minPrice(trip.getMinPrice())
                .availableDate(trip.getAvailableDate())
                .status(trip.getStatus().name().toLowerCase())
                .createdAt(trip.getCreatedAt() != null ? trip.getCreatedAt().toString() : null)
                .build();
    }

    public BookingResponseDto toBookingDto(BookingRequest booking,
                                         RoadConsignment consignment,
                                         ProofOfDelivery pod,
                                         List<TrackingEvent> events) {
        if (booking == null) return null;

        List<TrackingEventDto> eventDtos = new ArrayList<>();
        if (events != null) {
            for (TrackingEvent e : events) {
                eventDtos.add(TrackingEventDto.builder()
                        .type(e.getEventType().name())
                        .timestamp(e.getTimestamp() != null ? e.getTimestamp().toString() : null)
                        .actor(e.getActorRole())
                        .location(e.getLocation())
                        .notes(e.getNotes())
                        .build());
            }
        }

        DigitalRecordDto digitalRecord = null;
        if (consignment != null) {
            digitalRecord = DigitalRecordDto.builder()
                    .consignmentId(consignment.getId())
                    .bookingId(booking.getId())
                    .customer(booking.getCustomer().getName())
                    .driver(booking.getDriver().getName())
                    .vehicle(booking.getRoadTrip() != null ? booking.getRoadTrip().getVehicleType() : "")
                    .goods(booking.getLoad() != null ? booking.getLoad().getMaterial() : "")
                    .weight(booking.getWeightTons() + (booking.getUnit() != null ? booking.getUnit() : "T"))
                    .pickup(booking.getLoad() != null ? booking.getLoad().getOrigin() : "")
                    .drop(booking.getLoad() != null ? booking.getLoad().getDestination() : "")
                    .price(booking.getPrice())
                    .createdAt(consignment.getCreatedAt() != null ? consignment.getCreatedAt().toString() : null)
                    .status(booking.getStatus().name().toLowerCase())
                    .disclaimer(consignment.getDisclaimer())
                    .build();
        }

        PodDto podDto = null;
        if (pod != null) {
            podDto = PodDto.builder()
                    .podId(pod.getId())
                    .consignmentId(consignment != null ? consignment.getId() : null)
                    .otp(pod.getOtp())
                    .otpVerified(pod.getOtpVerified())
                    .deliveryTime(pod.getDeliveryTime() != null ? pod.getDeliveryTime().toString() : null)
                    .deliveryLocation(pod.getDeliveryLocation())
                    .receiverName(pod.getReceiverName())
                    .driver(booking.getDriver().getName())
                    .vehicle(booking.getRoadTrip() != null ? booking.getRoadTrip().getVehicleType() : "")
                    .build();
        }

        List<String> reasons = Collections.emptyList();
        if (booking.getReasonsJson() != null) {
            try {
                reasons = objectMapper.readValue(booking.getReasonsJson(), new TypeReference<List<String>>() {});
            } catch (Exception ignored) {}
        }

        Map<String, Integer> breakdown = new LinkedHashMap<>();
        if (booking.getRouteScore() != null) breakdown.put("route", booking.getRouteScore());
        if (booking.getCapacityScore() != null) breakdown.put("capacity", booking.getCapacityScore());
        if (booking.getTimeScore() != null) breakdown.put("time", booking.getTimeScore());
        if (booking.getDetourScore() != null) breakdown.put("detour", booking.getDetourScore());
        if (booking.getVehicleScore() != null) breakdown.put("vehicle", booking.getVehicleScore());
        if (booking.getReliabilityScore() != null) breakdown.put("reliability", booking.getReliabilityScore());

        return BookingResponseDto.builder()
                .id(booking.getId())
                .loadId(booking.getLoad().getId())
                .capacityId(booking.getRoadTrip().getId())
                .driverId(booking.getDriver().getId())
                .customerId(booking.getCustomer().getId())
                .weightTons(booking.getWeightTons())
                .unit(booking.getUnit())
                .price(booking.getPrice())
                .status(booking.getStatus().name().toLowerCase())
                .matchScore(booking.getMatchScore())
                .matchBreakdown(breakdown)
                .detourKm(booking.getDetourKm())
                .reasons(reasons)
                .events(eventDtos)
                .digitalRecord(digitalRecord)
                .pod(podDto)
                .createdAt(booking.getCreatedAt() != null ? booking.getCreatedAt().toString() : null)
                .load(toCargoLoadDto(booking.getLoad()))
                .capacity(toRoadTripDto(booking.getRoadTrip()))
                .driver(toUserDto(booking.getDriver()))
                .customer(toUserDto(booking.getCustomer()))
                .build();
    }
}
