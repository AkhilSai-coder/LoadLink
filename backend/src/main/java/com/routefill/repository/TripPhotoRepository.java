package com.routefill.repository;

import com.routefill.entity.TripPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TripPhotoRepository extends JpaRepository<TripPhoto, String> {
    List<TripPhoto> findByBookingIdOrderByUploadedAtAsc(String bookingId);
    List<TripPhoto> findByReviewStatus(String reviewStatus);
}
