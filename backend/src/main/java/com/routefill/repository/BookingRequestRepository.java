package com.routefill.repository;

import com.routefill.entity.BookingRequest;
import com.routefill.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BookingRequestRepository extends JpaRepository<BookingRequest, String> {
    List<BookingRequest> findByCustomerIdOrderByCreatedAtDesc(String customerId);
    List<BookingRequest> findByDriverIdOrderByCreatedAtDesc(String driverId);
    List<BookingRequest> findByRoadTripId(String tripId);
    List<BookingRequest> findByLoadId(String loadId);
    List<BookingRequest> findByStatus(BookingStatus status);
}
