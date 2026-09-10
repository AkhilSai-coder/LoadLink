package com.routefill.service;

import com.routefill.dto.response.CorridorSummaryDto;
import com.routefill.dto.response.ImpactDto;
import com.routefill.dto.response.PlatformStatsDto;
import com.routefill.dto.response.UserDto;
import com.routefill.entity.AiAnalysisLog;
import com.routefill.entity.DriverProfile;
import com.routefill.enums.AnalysisDecision;
import com.routefill.enums.KycStatus;
import com.routefill.enums.UserRole;
import com.routefill.exception.ResourceNotFoundException;
import com.routefill.jdbc.JdbcAnalyticsRepository;
import com.routefill.mapper.EntityDtoMapper;
import com.routefill.repository.AiAnalysisLogRepository;
import com.routefill.repository.DriverProfileRepository;
import com.routefill.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {
    private final DriverProfileRepository driverProfileRepository;
    private final UserRepository userRepository;
    private final AiAnalysisLogRepository aiAnalysisLogRepository;
    private final JdbcAnalyticsRepository jdbcAnalyticsRepository;
    private final EntityDtoMapper mapper;

    public List<UserDto> getKycQueue() {
        return driverProfileRepository.findByKycStatus(KycStatus.PENDING).stream()
                .map(dp -> mapper.toUserDto(dp.getUser()))
                .collect(Collectors.toList());
    }

    public List<UserDto> getAllDrivers() {
        return userRepository.findByRole(UserRole.DRIVER).stream()
                .map(mapper::toUserDto).collect(Collectors.toList());
    }

    @Transactional
    public void decideKyc(String driverId, String decision, String note) {
        DriverProfile dp = driverProfileRepository.findByUserId(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver profile not found"));

        if ("verified".equalsIgnoreCase(decision)) {
            dp.setKycStatus(KycStatus.VERIFIED);
        } else if ("rejected".equalsIgnoreCase(decision)) {
            dp.setKycStatus(KycStatus.REJECTED);
        }
        dp.setKycNote(note != null ? note : "");
        driverProfileRepository.save(dp);
    }

    public PlatformStatsDto getPlatformStats() {
        return jdbcAnalyticsRepository.getPlatformStats();
    }

    public List<CorridorSummaryDto> getAllCorridors() {
        return jdbcAnalyticsRepository.getAllCorridors();
    }

    public ImpactDto getPlatformImpact() {
        return jdbcAnalyticsRepository.getPlatformImpact();
    }

    public List<AiAnalysisLog> getFlaggedRecords() {
        return aiAnalysisLogRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(l -> l.getDecision() == AnalysisDecision.FLAGGED_FOR_ADMIN_REVIEW)
                .collect(Collectors.toList());
    }

    public List<AiAnalysisLog> getAutoRejectedRecords() {
        return aiAnalysisLogRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(l -> l.getDecision() == AnalysisDecision.AUTO_REJECTED)
                .collect(Collectors.toList());
    }

    public List<AiAnalysisLog> getLogsForEntity(String entityType, String entityId) {
        return aiAnalysisLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId);
    }
}
