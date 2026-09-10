package com.routefill.repository;

import com.routefill.entity.RoadConsignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RoadConsignmentRepository extends JpaRepository<RoadConsignment, String> {
    Optional<RoadConsignment> findByBookingId(String bookingId);
}
