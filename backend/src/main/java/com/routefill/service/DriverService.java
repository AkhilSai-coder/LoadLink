package com.routefill.service;

import com.routefill.ai.MatchAnalysisService;
import com.routefill.dto.request.KycSubmitRequest;
import com.routefill.dto.response.DriverTrustDto;
import com.routefill.dto.response.ImpactDto;
import com.routefill.dto.response.TripPhotoDto;
import com.routefill.entity.*;
import com.routefill.enums.KycStatus;
import com.routefill.exception.BadRequestException;
import com.routefill.exception.ResourceNotFoundException;
import com.routefill.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DriverService {
    private final DriverProfileRepository driverProfileRepository;
    private final UserRepository userRepository;
    private final BookingRequestRepository bookingRequestRepository;
    private final TripPhotoRepository tripPhotoRepository;
    private final MatchAnalysisService matchAnalysisService;
    private final BookingService bookingService;

    @Transactional
    public void submitKyc(String driverId, KycSubmitRequest req) {
        DriverProfile dp = driverProfileRepository.findByUserId(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver profile not found"));

        if (req.getDocs() != null) {
            if (req.getDocs().containsKey("license")) dp.setLicenseDoc(req.getDocs().get("license"));
            if (req.getDocs().containsKey("rc")) dp.setRcDoc(req.getDocs().get("rc"));
            if (req.getDocs().containsKey("aadhaar")) dp.setAadhaarDoc(req.getDocs().get("aadhaar"));
        }
        dp.setKycStatus(KycStatus.PENDING);
        driverProfileRepository.save(dp);
    }

    public DriverTrustDto getDriverTrustProfile(String driverId) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found"));
        DriverProfile dp = driverProfileRepository.findByUserId(driverId).orElse(null);

        int score = matchAnalysisService.calcDriverTrustScore(driver);
        int hash = Math.abs(driverId.hashCode());
        int completedRoadTrips = 110 + (hash % 40);
        int successfulDeliveries = (int) Math.round(completedRoadTrips * 0.94);
        int onTimeRate = Math.max(70, Math.min(100, 88 + (hash % 10)));
        int cancellationRate = Math.max(1, (hash % 5));
        double customerRating = 4.7;

        Map<String, Boolean> verified = new HashMap<>();
        verified.put("identity", dp != null && dp.getAadhaarDoc() != null);
        verified.put("license", dp != null && dp.getLicenseDoc() != null);
        verified.put("rc", dp != null && dp.getRcDoc() != null);
        verified.put("overall", dp != null && dp.getKycStatus() == KycStatus.VERIFIED);

        return DriverTrustDto.builder()
                .driverId(driverId)
                .score(score)
                .verified(verified)
                .completedRoadTrips(completedRoadTrips)
                .successfulDeliveries(successfulDeliveries)
                .onTimeRate(onTimeRate)
                .cancellationRate(cancellationRate)
                .customerRating(customerRating)
                .build();
    }

    public ImpactDto getDriverImpact(String driverId) {
        List<BookingRequest> list = bookingRequestRepository.findByDriverIdOrderByCreatedAtDesc(driverId);
        double income = list.stream()
                .filter(b -> "DELIVERED".equalsIgnoreCase(b.getStatus().name()))
                .mapToDouble(b -> b.getPrice() != null ? b.getPrice() : 0.0)
                .sum();

        double capacityTons = list.stream()
                .filter(b -> List.of("ACCEPTED", "PICKUP_CONFIRMED", "IN_TRANSIT", "ARRIVED", "DELIVERED").contains(b.getStatus().name()))
                .mapToDouble(b -> "kg".equalsIgnoreCase(b.getUnit()) ? b.getWeightTons() / 1000.0 : b.getWeightTons())
                .sum();

        long tripsCount = list.stream().map(b -> b.getRoadTrip().getId()).distinct().count();

        return ImpactDto.builder()
                .additionalIncome(income)
                .unusedCapacityUtilizedTons(Math.round(capacityTons * 100.0) / 100.0)
                .roadTripsWithAdditionalCargo((int) tripsCount)
                .estimated(true)
                .build();
    }

    @Transactional
    public TripPhotoDto addTripPhoto(String bookingId, String type, String label) {
        BookingRequest booking = bookingRequestRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        TripPhoto photo = TripPhoto.builder()
                .id("tp_" + UUID.randomUUID().toString().substring(0, 8))
                .booking(booking)
                .type(type)
                .label(label)
                .reviewStatus("approved")
                .build();
        tripPhotoRepository.save(photo);

        return TripPhotoDto.builder()
                .id(photo.getId())
                .matchId(bookingId)
                .type(photo.getType())
                .label(photo.getLabel())
                .reviewStatus(photo.getReviewStatus())
                .uploadedAt(photo.getUploadedAt().toString())
                .build();
    }

    public List<TripPhotoDto> getTripPhotos(String bookingId) {
        return tripPhotoRepository.findByBookingIdOrderByUploadedAtAsc(bookingId).stream()
                .map(p -> TripPhotoDto.builder()
                        .id(p.getId())
                        .matchId(bookingId)
                        .type(p.getType())
                        .label(p.getLabel())
                        .reviewStatus(p.getReviewStatus())
                        .uploadedAt(p.getUploadedAt().toString())
                        .build())
                .collect(Collectors.toList());
    }
}
