package com.routefill.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DigitalRecordDto {
    private String consignmentId;
    private String bookingId;
    private String customer;
    private String driver;
    private String vehicle;
    private String goods;
    private String weight;
    private String pickup;
    private String drop;
    private Double price;
    private String createdAt;
    private String status;
    private String disclaimer;
}
