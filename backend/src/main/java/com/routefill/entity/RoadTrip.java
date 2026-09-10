package com.routefill.entity;

import com.routefill.enums.TripStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "road_trips")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadTrip {
    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @Column(nullable = false, length = 128)
    private String origin;

    @Column(nullable = false, length = 128)
    private String destination;

    @Column(name = "vehicle_type", length = 64)
    private String vehicleType;

    @Column(length = 16)
    @Builder.Default
    private String unit = "T";

    @Column(name = "total_capacity_tons", nullable = false)
    private Double totalCapacityTons;

    @Column(name = "existing_load_tons", nullable = false)
    @Builder.Default
    private Double existingLoadTons = 0.0;

    @Column(name = "booked_tons", nullable = false)
    @Builder.Default
    private Double bookedTons = 0.0;

    @Column(name = "available_backhaul_tons", nullable = false)
    private Double availableBackhaulTons;

    @Column(name = "remaining_tons", nullable = false)
    private Double remainingTons;

    @Column(name = "min_price", nullable = false)
    private Double minPrice;

    @Column(name = "available_date", length = 32)
    private String availableDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private TripStatus status = TripStatus.OPEN;

    @Version
    private Long version;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        recalculate();
    }

    public void recalculate() {
        double total = totalCapacityTons != null ? totalCapacityTons : 0.0;
        double existing = existingLoadTons != null ? existingLoadTons : 0.0;
        double booked = bookedTons != null ? bookedTons : 0.0;
        this.availableBackhaulTons = Math.max(0.0, total - existing);
        this.remainingTons = Math.max(0.0, this.availableBackhaulTons - booked);
        this.status = this.remainingTons > 0.0001 ? TripStatus.OPEN : TripStatus.FULL;
    }
}
