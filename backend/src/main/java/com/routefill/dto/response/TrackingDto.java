package com.routefill.dto.response;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingDto {
    private String consignmentId;
    private String status;
    private String statusLabel;
    private String origin;
    private String destination;
    private List<String> waypoints;
    private int currentStageIndex;
    private String vehicleType;
    private int etaHours;
    private boolean simulated;
    private List<TrackingEventDto> events;
}
