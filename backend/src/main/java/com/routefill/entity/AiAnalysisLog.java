package com.routefill.entity;

import com.routefill.enums.AnalysisDecision;
import com.routefill.enums.AnalysisType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_analysis_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAnalysisLog {
    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "entity_type", nullable = false, length = 64)
    private String entityType;

    @Column(name = "entity_id", nullable = false, length = 64)
    private String entityId;

    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_type", nullable = false, length = 64)
    private AnalysisType analysisType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private AnalysisDecision decision;

    private Integer score;

    private Integer confidence;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "analysis_details_json", columnDefinition = "TEXT")
    private String analysisDetailsJson;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
