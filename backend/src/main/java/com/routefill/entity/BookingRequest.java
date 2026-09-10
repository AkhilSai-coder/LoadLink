package com.routefill.entity;

import com.routefill.enums.BookingStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "booking_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingRequest {
    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "load_id", nullable = false)
    private CargoLoad load;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private RoadTrip roadTrip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @Column(name = "weight_tons", nullable = false)
    private Double weightTons;

    @Column(length = 16)
    @Builder.Default
    private String unit = "T";

    @Column(nullable = false)
    private Double price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING_AI_ANALYSIS;

    @Column(name = "match_score")
    private Integer matchScore;

    @Column(name = "route_score")
    private Integer routeScore;

    @Column(name = "capacity_score")
    private Integer capacityScore;

    @Column(name = "time_score")
    private Integer timeScore;

    @Column(name = "detour_score")
    private Integer detourScore;

    @Column(name = "vehicle_score")
    private Integer vehicleScore;

    @Column(name = "reliability_score")
    private Integer reliabilityScore;

    @Column(name = "detour_km")
    private Double detourKm;

    @Column(name = "reasons_json", columnDefinition = "TEXT")
    private String reasonsJson;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
