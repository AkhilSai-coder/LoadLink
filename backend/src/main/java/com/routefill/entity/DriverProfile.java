package com.routefill.entity;

import com.routefill.enums.KycStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "driver_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriverProfile {
    @Id
    @Column(length = 64)
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "vehicle_type", length = 64)
    private String vehicleType;

    @Column(name = "vehicle_number", length = 64)
    private String vehicleNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "kyc_status", nullable = false, length = 32)
    private KycStatus kycStatus;

    @Column(name = "license_doc", length = 255)
    private String licenseDoc;

    @Column(name = "rc_doc", length = 255)
    private String rcDoc;

    @Column(name = "aadhaar_doc", length = 255)
    private String aadhaarDoc;

    @Column(name = "kyc_note", length = 512)
    private String kycNote;
}
