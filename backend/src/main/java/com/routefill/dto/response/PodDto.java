package com.routefill.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PodDto {
    private String podId;
    private String consignmentId;
    private String otp;
    private Boolean otpVerified;
    private String deliveryTime;
    private String deliveryLocation;
    private String receiverName;
    private String driver;
    private String vehicle;
}
