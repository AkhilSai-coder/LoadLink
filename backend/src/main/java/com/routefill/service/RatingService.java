package com.routefill.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.routefill.dto.request.RateTripRequest;
import com.routefill.entity.BookingRequest;
import com.routefill.entity.Rating;
import com.routefill.enums.BookingStatus;
import com.routefill.exception.BadRequestException;
import com.routefill.exception.ResourceNotFoundException;
import com.routefill.repository.BookingRequestRepository;
import com.routefill.repository.RatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RatingService {
    private final RatingRepository ratingRepository;
    private final BookingRequestRepository bookingRequestRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public void rateTrip(String matchId, RateTripRequest req) {
        BookingRequest booking = bookingRequestRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        if (booking.getStatus() != BookingStatus.DELIVERED) {
            throw new BadRequestException("You can rate this trip once it has been delivered.");
        }

        String role = req.getRaterRole() != null ? req.getRaterRole().toLowerCase() : "customer";
        int overall = 5;
        if (req.getRatings() != null && req.getRatings().containsKey("overall")) {
            overall = ((Number) req.getRatings().get("overall")).intValue();
        }

        String json = "{}";
        try {
            if (req.getRatings() != null) json = objectMapper.writeValueAsString(req.getRatings());
        } catch (Exception ignored) {}

        Optional<Rating> existing = ratingRepository.findByBookingIdAndRaterRole(matchId, role);
        if (existing.isPresent()) {
            Rating r = existing.get();
            r.setOverallRating(overall);
            r.setRatingsJson(json);
            r.setReview(req.getReview());
            r.setUpdatedAt(LocalDateTime.now());
            ratingRepository.save(r);
        } else {
            Rating r = Rating.builder()
                    .id("rt_" + UUID.randomUUID().toString().substring(0, 8))
                    .booking(booking)
                    .raterRole(role)
                    .overallRating(overall)
                    .ratingsJson(json)
                    .review(req.getReview())
                    .build();
            ratingRepository.save(r);
        }
    }

    public Map<String, Object> getRatingsForMatch(String matchId) {
        Map<String, Object> res = new HashMap<>();
        res.put("customer", null);
        res.put("driver", null);

        List<Rating> list = ratingRepository.findByBookingId(matchId);
        for (Rating r : list) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("raterRole", r.getRaterRole());
            map.put("review", r.getReview());
            try {
                Map<String, Object> ratingsMap = objectMapper.readValue(r.getRatingsJson(), new TypeReference<Map<String, Object>>() {});
                map.put("ratings", ratingsMap);
            } catch (Exception e) {
                map.put("ratings", Map.of("overall", r.getOverallRating()));
            }
            res.put(r.getRaterRole().toLowerCase(), map);
        }
        return res;
    }
}
