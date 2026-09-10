package com.routefill.dto.response;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadinessDto {
    private List<ChecklistItem> checklist;
    private boolean ready;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChecklistItem {
        private String label;
        private boolean ok;
    }
}
