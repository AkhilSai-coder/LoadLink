package com.routefill.repository;

import com.routefill.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RatingRepository extends JpaRepository<Rating, String> {
    List<Rating> findByBookingId(String bookingId);
    Optional<Rating> findByBookingIdAndRaterRole(String bookingId, String raterRole);
}
