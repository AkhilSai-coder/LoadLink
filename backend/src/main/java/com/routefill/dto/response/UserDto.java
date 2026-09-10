package com.routefill.dto.response;

import lombok.*;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {
    private String id;
    private String role;
    private String name;
    private String email;
    private String phone;
    private String company;
    private String vehicleType;
    private String vehicleNumber;
    private String kycStatus;
    private Map<String, String> kycDocs;
    private String kycNote;
    private String createdAt;
}
