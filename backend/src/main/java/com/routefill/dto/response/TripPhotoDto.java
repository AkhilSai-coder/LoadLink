package com.routefill.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TripPhotoDto {
    private String id;
    private String matchId;
    private String type;
    private String label;
    private String reviewStatus;
    private String uploadedAt;
    private BookingResponseDto match;
}
