package com.routefill.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proof_of_delivery")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProofOfDelivery {
    @Id
    @Column(length = 64)
    private String id; // POD-RF-2026-XXXXXX

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private BookingRequest booking;

    @Column(nullable = false, length = 16)
    private String otp;

    @Column(name = "otp_verified", nullable = false)
    @Builder.Default
    private Boolean otpVerified = false;

    @Column(name = "receiver_name", length = 128)
    private String receiverName;

    @Column(name = "delivery_location", length = 128)
    private String deliveryLocation;

    @Column(name = "delivery_time")
    private LocalDateTime deliveryTime;
}
