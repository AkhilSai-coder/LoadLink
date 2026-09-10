package com.routefill.validation;

import com.routefill.enums.BookingStatus;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class StatusTransitionValidator {
    private static final Map<BookingStatus, Set<BookingStatus>> ALLOWED_TRANSITIONS = new EnumMap<>(BookingStatus.class);

    static {
        ALLOWED_TRANSITIONS.put(BookingStatus.PENDING_AI_ANALYSIS,
                Set.of(BookingStatus.PENDING_DRIVER_REVIEW, BookingStatus.AUTO_REJECTED, BookingStatus.CANCELLED));

        ALLOWED_TRANSITIONS.put(BookingStatus.PENDING_DRIVER_REVIEW,
                Set.of(BookingStatus.ACCEPTED, BookingStatus.REJECTED, BookingStatus.CANCELLED));

        ALLOWED_TRANSITIONS.put(BookingStatus.ACCEPTED,
                Set.of(BookingStatus.PICKUP_CONFIRMED, BookingStatus.CANCELLED, BookingStatus.DISPUTED));

        ALLOWED_TRANSITIONS.put(BookingStatus.PICKUP_CONFIRMED,
                Set.of(BookingStatus.IN_TRANSIT, BookingStatus.DISPUTED));

        ALLOWED_TRANSITIONS.put(BookingStatus.IN_TRANSIT,
                Set.of(BookingStatus.ARRIVED, BookingStatus.DISPUTED));

        ALLOWED_TRANSITIONS.put(BookingStatus.ARRIVED,
                Set.of(BookingStatus.DELIVERED, BookingStatus.DISPUTED));

        ALLOWED_TRANSITIONS.put(BookingStatus.DELIVERED,
                Set.of(BookingStatus.DISPUTED));

        ALLOWED_TRANSITIONS.put(BookingStatus.REJECTED, Collections.emptySet());
        ALLOWED_TRANSITIONS.put(BookingStatus.AUTO_REJECTED, Collections.emptySet());
        ALLOWED_TRANSITIONS.put(BookingStatus.CANCELLED, Collections.emptySet());
        ALLOWED_TRANSITIONS.put(BookingStatus.DISPUTED, Collections.emptySet());
    }

    public boolean canTransition(BookingStatus from, BookingStatus to) {
        if (from == null || to == null) return false;
        Set<BookingStatus> valid = ALLOWED_TRANSITIONS.get(from);
        return valid != null && valid.contains(to);
    }
}
