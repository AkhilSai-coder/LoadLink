package com.routefill.repository;

import com.routefill.entity.ProofOfDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ProofOfDeliveryRepository extends JpaRepository<ProofOfDelivery, String> {
    Optional<ProofOfDelivery> findByBookingId(String bookingId);
}
