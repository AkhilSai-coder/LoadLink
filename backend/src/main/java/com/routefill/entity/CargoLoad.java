package com.routefill.entity;

import com.routefill.enums.LoadStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "cargo_loads")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CargoLoad {
    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @Column(nullable = false, length = 255)
    private String material;

    @Column(name = "weight_tons", nullable = false)
    private Double weightTons;

    @Column(length = 16)
    @Builder.Default
    private String unit = "T";

    @Column(nullable = false, length = 128)
    private String origin;

    @Column(nullable = false, length = 128)
    private String destination;

    @Column(name = "pickup_date", length = 32)
    private String pickupDate;

    @Column(nullable = false)
    private Double budget;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private LoadStatus status = LoadStatus.OPEN;

    @Column(name = "match_id", length = 64)
    private String matchId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
