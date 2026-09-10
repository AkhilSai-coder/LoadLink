package com.routefill.repository;

import com.routefill.entity.DriverProfile;
import com.routefill.enums.KycStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DriverProfileRepository extends JpaRepository<DriverProfile, String> {
    Optional<DriverProfile> findByUserId(String userId);
    List<DriverProfile> findByKycStatus(KycStatus status);
}
