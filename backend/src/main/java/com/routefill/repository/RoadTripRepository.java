package com.routefill.repository;

import com.routefill.entity.RoadTrip;
import com.routefill.enums.TripStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoadTripRepository extends JpaRepository<RoadTrip, String> {
    List<RoadTrip> findByDriverIdOrderByCreatedAtDesc(String driverId);
    List<RoadTrip> findByStatusOrderByCreatedAtDesc(TripStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RoadTrip r WHERE r.id = :id")
    Optional<RoadTrip> findByIdForUpdate(@Param("id") String id);

    @Query("SELECT r FROM RoadTrip r WHERE r.remainingTons > 0")
    List<RoadTrip> findOpenCapacities();
}
