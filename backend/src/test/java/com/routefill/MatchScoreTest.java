package com.routefill;

import com.routefill.ai.MatchAnalysisService;
import com.routefill.ai.MatchScoreResult;
import com.routefill.entity.CargoLoad;
import com.routefill.entity.DriverProfile;
import com.routefill.entity.RoadTrip;
import com.routefill.entity.User;
import com.routefill.enums.KycStatus;
import com.routefill.enums.UserRole;
import com.routefill.repository.BookingRequestRepository;
import com.routefill.repository.DriverProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class MatchScoreTest {

    @Mock
    private DriverProfileRepository driverProfileRepository;

    @Mock
    private BookingRequestRepository bookingRequestRepository;

    @InjectMocks
    private MatchAnalysisService matchAnalysisService;

    private User driver;
    private RoadTrip trip;
    private CargoLoad load;

    @BeforeEach
    void setUp() {
        driver = User.builder().id("u_drv3").name("Ganesh Kale").email("ganesh@example.com").role(UserRole.DRIVER).build();
        DriverProfile dp = DriverProfile.builder().id("dp_drv3").user(driver).kycStatus(KycStatus.VERIFIED).build();

        when(driverProfileRepository.findByUserId("u_drv3")).thenReturn(Optional.of(dp));
        when(bookingRequestRepository.findByDriverIdOrderByCreatedAtDesc("u_drv3")).thenReturn(Collections.emptyList());

        // Flagship Demo: Tata Ace, Vijayawada -> Hyderabad, 750kg total, 350kg load, 400kg available
        trip = RoadTrip.builder()
                .id("cp_3001")
                .driver(driver)
                .origin("Vijayawada, AP")
                .destination("Hyderabad, TS")
                .vehicleType("Tata Ace - 0.75T")
                .unit("kg")
                .totalCapacityTons(750.0)
                .existingLoadTons(350.0)
                .bookedTons(0.0)
                .availableDate("2026-09-12")
                .minPrice(3200.0)
                .build();
        trip.recalculate();

        // Customer: 250 kg Handicraft cartons, Vijayawada -> Hyderabad
        load = CargoLoad.builder()
                .id("ld_2001")
                .material("Handicraft cartons")
                .weightTons(250.0)
                .unit("kg")
                .origin("Vijayawada, AP")
                .destination("Hyderabad, TS")
                .pickupDate("2026-09-12")
                .budget(3200.0)
                .build();
    }

    @Test
    void testDeterministicMatchScore() {
        MatchScoreResult result1 = matchAnalysisService.computeMatchScore(load, trip);
        MatchScoreResult result2 = matchAnalysisService.computeMatchScore(load, trip);

        assertNotNull(result1);
        assertEquals(result1.getScore(), result2.getScore(), "Match score must be deterministic");
        assertTrue(result1.isFits(), "250kg cargo fits within 400kg available backhaul capacity");
        assertTrue(result1.getScore() >= 85, "Expected high match score on identical corridor and capacity fit");
        assertEquals(25, result1.getBreakdown().get("route"), "Exact corridor match should yield full route score (25)");
        assertEquals(15, result1.getBreakdown().get("time"), "Same day availability should yield full time score (15)");
    }
}
