package com.routefill.dto.request;

import lombok.*;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class KycSubmitRequest {
    private Map<String, String> docs;
}
