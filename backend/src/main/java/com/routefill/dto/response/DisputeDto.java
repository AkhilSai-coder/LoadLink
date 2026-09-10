package com.routefill.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisputeDto {
    private String id;
    private String matchId;
    private String raisedBy;
    private String reason;
    private String status;
    private String resolutionNote;
    private String createdAt;
    private BookingResponseDto match;
}
