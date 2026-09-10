package com.routefill.repository;

import com.routefill.entity.Bill;
import com.routefill.enums.BillStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BillRepository extends JpaRepository<Bill, String> {
    List<Bill> findByDriverIdOrderByCreatedAtDesc(String driverId);
    List<Bill> findByStatusOrderByCreatedAtDesc(BillStatus status);
    List<Bill> findByBookingId(String bookingId);
}
