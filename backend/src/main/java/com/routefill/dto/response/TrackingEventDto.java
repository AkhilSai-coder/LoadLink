package com.routefill.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingEventDto {
    private String type;
    private String timestamp;
    private String actor;
    private String location;
    private String notes;
}
