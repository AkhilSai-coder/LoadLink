package com.routefill.repository;

import com.routefill.entity.CargoLoad;
import com.routefill.enums.LoadStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CargoLoadRepository extends JpaRepository<CargoLoad, String> {
    List<CargoLoad> findByCustomerIdOrderByCreatedAtDesc(String customerId);
    List<CargoLoad> findByStatusOrderByCreatedAtDesc(LoadStatus status);
    List<CargoLoad> findByStatus(LoadStatus status);
}
