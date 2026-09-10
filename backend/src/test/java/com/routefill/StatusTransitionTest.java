package com.routefill;

import com.routefill.enums.BookingStatus;
import com.routefill.validation.StatusTransitionValidator;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class StatusTransitionTest {
    private final StatusTransitionValidator validator = new StatusTransitionValidator();

    @Test
    void testValidTransitions() {
        assertTrue(validator.canTransition(BookingStatus.PENDING_AI_ANALYSIS, BookingStatus.PENDING_DRIVER_REVIEW));
        assertTrue(validator.canTransition(BookingStatus.PENDING_DRIVER_REVIEW, BookingStatus.ACCEPTED));
        assertTrue(validator.canTransition(BookingStatus.ACCEPTED, BookingStatus.PICKUP_CONFIRMED));
        assertTrue(validator.canTransition(BookingStatus.PICKUP_CONFIRMED, BookingStatus.IN_TRANSIT));
        assertTrue(validator.canTransition(BookingStatus.IN_TRANSIT, BookingStatus.ARRIVED));
        assertTrue(validator.canTransition(BookingStatus.ARRIVED, BookingStatus.DELIVERED));
    }

    @Test
    void testInvalidTransitionsBlocked() {
        // Direct jump from requested to delivered is prohibited
        assertFalse(validator.canTransition(BookingStatus.PENDING_DRIVER_REVIEW, BookingStatus.DELIVERED));
        assertFalse(validator.canTransition(BookingStatus.ACCEPTED, BookingStatus.DELIVERED));
        // Moving backward from delivered is prohibited
        assertFalse(validator.canTransition(BookingStatus.DELIVERED, BookingStatus.ACCEPTED));
        // Once rejected, cannot become accepted
        assertFalse(validator.canTransition(BookingStatus.REJECTED, BookingStatus.ACCEPTED));
    }
}
