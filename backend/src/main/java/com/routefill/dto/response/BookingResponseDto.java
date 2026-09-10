package com.routefill.dto.response;

import lombok.*;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingResponseDto {
    private String id;
    private String loadId;
    private String capacityId;
    private String driverId;
    private String customerId;
    private Double weightTons;
    private String unit;
    private Double price;
    private String status;
    private Integer matchScore;
    private Map<String, Integer> matchBreakdown;
    private Double detourKm;
    private List<String> reasons;
    private List<TrackingEventDto> events;
    private DigitalRecordDto digitalRecord;
    private PodDto pod;
    private String createdAt;

    // Embedded objects for frontend convenience
    private CargoLoadDto load;
    private RoadTripDto capacity;
    private UserDto driver;
    private UserDto customer;
}
