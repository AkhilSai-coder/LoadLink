package com.routefill.data;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.routefill.entity.*;
import com.routefill.enums.*;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {
    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    private final EntityManager em;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional
    public void run(String... args) {
        // Ensure both LoadLink admins exist
        ensureAdmin("admin@loadlink.in", "admin123", "Rajesh Sharma", "9820011223");
        ensureAdmin("ops@loadlink.in", "admin123", "Ananya Verma", "9820011224");
        ensureAdmin("admin@routefill.in", "admin123", "Meera Shah", "9820011225");

        Long userCount = em.createQuery("SELECT COUNT(u) FROM User u", Long.class).getSingleResult();
        if (userCount > 3) {
            logger.info("Database already seeded with demo data.");
            return;
        }

        logger.info("Seeding LoadLink production demo data via EntityManager persist...");

        // 1. Admin
        User admin = User.builder()
                .id("u_admin1")
                .name("Meera Shah")
                .email("admin@routefill.in")
                .password(passwordEncoder.encode("admin123"))
                .phone("9820011223")
                .role(UserRole.ADMIN)
                .build();
        em.persist(admin);

        // 2. Customers
        User cust1 = User.builder()
                .id("u_cust1")
                .name("Rohit Deshmukh")
                .email("rohit@deshmukhagro.in")
                .password(passwordEncoder.encode("demo1234"))
                .phone("9822344556")
                .role(UserRole.CUSTOMER)
                .build();
        em.persist(cust1);

        CustomerProfile cp1 = CustomerProfile.builder()
                .id("cp_cust1")
                .user(cust1)
                .companyName("Deshmukh Agro Traders")
                .build();
        em.persist(cp1);

        User cust2 = User.builder()
                .id("u_cust2")
                .name("Priya Nair")
                .email("priya@nairtextiles.in")
                .password(passwordEncoder.encode("demo1234"))
                .phone("9845567788")
                .role(UserRole.CUSTOMER)
                .build();
        em.persist(cust2);

        CustomerProfile cp2 = CustomerProfile.builder()
                .id("cp_cust2")
                .user(cust2)
                .companyName("Nair Textiles Pvt Ltd")
                .build();
        em.persist(cp2);

        // 3. Drivers
        User drv1 = User.builder()
                .id("u_drv1")
                .name("Suresh Patil")
                .email("suresh@example.com")
                .password(passwordEncoder.encode("demo1234"))
                .phone("9867788990")
                .role(UserRole.DRIVER)
                .build();
        em.persist(drv1);

        DriverProfile dp1 = DriverProfile.builder()
                .id("dp_drv1")
                .user(drv1)
                .vehicleType("Open Truck - 9T")
                .vehicleNumber("MH12 AB 4521")
                .kycStatus(KycStatus.VERIFIED)
                .licenseDoc("DL_suresh.pdf")
                .rcDoc("RC_suresh.pdf")
                .aadhaarDoc("AAD_suresh.pdf")
                .build();
        em.persist(dp1);

        User drv2 = User.builder()
                .id("u_drv2")
                .name("Iqbal Sheikh")
                .email("iqbal@example.com")
                .password(passwordEncoder.encode("demo1234"))
                .phone("9911223344")
                .role(UserRole.DRIVER)
                .build();
        em.persist(drv2);

        DriverProfile dp2 = DriverProfile.builder()
                .id("dp_drv2")
                .user(drv2)
                .vehicleType("Container - 20ft")
                .vehicleNumber("MH14 CD 7710")
                .kycStatus(KycStatus.PENDING)
                .licenseDoc("DL_iqbal.pdf")
                .rcDoc("RC_iqbal.pdf")
                .build();
        em.persist(dp2);

        // Flagship Demo Driver: Ganesh Kale (Vijayawada -> Hyderabad, Tata Ace)
        User drv3 = User.builder()
                .id("u_drv3")
                .name("Ganesh Kale")
                .email("ganesh@example.com")
                .password(passwordEncoder.encode("demo1234"))
                .phone("9933445566")
                .role(UserRole.DRIVER)
                .build();
        em.persist(drv3);

        DriverProfile dp3 = DriverProfile.builder()
                .id("dp_drv3")
                .user(drv3)
                .vehicleType("Tata Ace - 0.75T")
                .vehicleNumber("AP16 GK 7788")
                .kycStatus(KycStatus.VERIFIED)
                .licenseDoc("DL_ganesh.pdf")
                .rcDoc("RC_ganesh.pdf")
                .aadhaarDoc("AAD_ganesh.pdf")
                .build();
        em.persist(dp3);

        em.flush();

        // 4. Road Trips
        RoadTrip cp2001 = RoadTrip.builder()
                .id("cp_2001")
                .driver(drv1)
                .origin("Pune, MH")
                .destination("Nashik, MH")
                .vehicleType("Open Truck - 9T")
                .unit("T")
                .totalCapacityTons(8.0)
                .existingLoadTons(0.0)
                .bookedTons(0.0)
                .availableDate("2026-09-06")
                .minPrice(12000.0)
                .status(TripStatus.OPEN)
                .build();
        cp2001.recalculate();
        em.persist(cp2001);

        RoadTrip cp2002 = RoadTrip.builder()
                .id("cp_2002")
                .driver(drv1)
                .origin("Mumbai, MH")
                .destination("Nagpur, MH")
                .vehicleType("Open Truck - 9T")
                .unit("T")
                .totalCapacityTons(6.0)
                .existingLoadTons(0.0)
                .bookedTons(6.0)
                .availableDate("2026-09-10")
                .minPrice(20000.0)
                .status(TripStatus.FULL)
                .build();
        cp2002.recalculate();
        em.persist(cp2002);

        RoadTrip cp2003 = RoadTrip.builder()
                .id("cp_2003")
                .driver(drv2)
                .origin("Pune, MH")
                .destination("Surat, GJ")
                .vehicleType("Container - 20ft")
                .unit("T")
                .totalCapacityTons(5.0)
                .existingLoadTons(0.0)
                .bookedTons(0.0)
                .availableDate("2026-09-08")
                .minPrice(16000.0)
                .status(TripStatus.OPEN)
                .build();
        cp2003.recalculate();
        em.persist(cp2003);

        // Flagship Demo Scenario: cp_3001 (Vijayawada -> Hyderabad, Tata Ace, 750kg total, 350kg load, 400kg available)
        RoadTrip cp3001 = RoadTrip.builder()
                .id("cp_3001")
                .driver(drv3)
                .origin("Vijayawada, AP")
                .destination("Hyderabad, TS")
                .vehicleType("Tata Ace - 0.75T")
                .unit("kg")
                .totalCapacityTons(750.0)
                .existingLoadTons(350.0)
                .bookedTons(0.0)
                .availableDate("2026-09-12")
                .minPrice(3200.0)
                .status(TripStatus.OPEN)
                .build();
        cp3001.recalculate();
        em.persist(cp3001);

        // 5. Cargo Loads
        CargoLoad ld1001 = CargoLoad.builder()
                .id("ld_1001")
                .customer(cust1)
                .material("Onion sacks (50kg)")
                .weightTons(8.0)
                .unit("T")
                .origin("Nashik, MH")
                .destination("Pune, MH")
                .pickupDate("2026-09-06")
                .budget(14000.0)
                .notes("Loading dock available, forklift on site.")
                .status(LoadStatus.OPEN)
                .build();
        em.persist(ld1001);

        CargoLoad ld1002 = CargoLoad.builder()
                .id("ld_1002")
                .customer(cust1)
                .material("Cotton bales")
                .weightTons(6.0)
                .unit("T")
                .origin("Nagpur, MH")
                .destination("Mumbai, MH")
                .pickupDate("2026-09-10")
                .budget(22000.0)
                .notes("")
                .status(LoadStatus.MATCHED)
                .matchId("mt_5001")
                .build();
        em.persist(ld1002);

        CargoLoad ld1003 = CargoLoad.builder()
                .id("ld_1003")
                .customer(cust2)
                .material("Textile rolls")
                .weightTons(4.0)
                .unit("T")
                .origin("Surat, GJ")
                .destination("Pune, MH")
                .pickupDate("2026-09-08")
                .budget(18500.0)
                .notes("Handle with care, moisture-sensitive.")
                .status(LoadStatus.OPEN)
                .build();
        em.persist(ld1003);

        CargoLoad ld1004 = CargoLoad.builder()
                .id("ld_1004")
                .customer(cust2)
                .material("Dyed yarn spools")
                .weightTons(3.0)
                .unit("T")
                .origin("Pune, MH")
                .destination("Bengaluru, KA")
                .pickupDate("2026-09-14")
                .budget(26000.0)
                .notes("")
                .status(LoadStatus.DRAFT)
                .build();
        em.persist(ld1004);

        // Flagship Demo Scenario: ld_2001 (Priya's 250 kg Handicraft cartons, Vijayawada -> Hyderabad)
        CargoLoad ld2001 = CargoLoad.builder()
                .id("ld_2001")
                .customer(cust2)
                .material("Handicraft cartons")
                .weightTons(250.0)
                .unit("kg")
                .origin("Vijayawada, AP")
                .destination("Hyderabad, TS")
                .pickupDate("2026-09-12")
                .budget(3200.0)
                .notes("Small cartons, stackable, no special handling.")
                .status(LoadStatus.OPEN)
                .build();
        em.persist(ld2001);

        em.flush();

        // 6. Existing Match mt_5001
        String reasonsJson = "[]";
        try {
            reasonsJson = objectMapper.writeValueAsString(List.of(
                    "Vehicle is already travelling on this route",
                    "Capacity fits your shipment",
                    "Pickup detour is minimal",
                    "Driver is verified"
            ));
        } catch (Exception ignored) {}

        BookingRequest mt5001 = BookingRequest.builder()
                .id("mt_5001")
                .load(ld1002)
                .roadTrip(cp2002)
                .customer(cust1)
                .driver(drv1)
                .weightTons(6.0)
                .unit("T")
                .price(21000.0)
                .status(BookingStatus.IN_TRANSIT)
                .matchScore(88)
                .routeScore(30)
                .capacityScore(24)
                .timeScore(18)
                .detourScore(11)
                .vehicleScore(5)
                .reliabilityScore(15)
                .detourKm(2.4)
                .reasonsJson(reasonsJson)
                .build();
        em.persist(mt5001);

        RoadConsignment rc5001 = RoadConsignment.builder()
                .id("RF-2026-005001")
                .booking(mt5001)
                .build();
        em.persist(rc5001);

        // Tracking events for mt_5001
        em.persist(TrackingEvent.builder().id("ev_1").booking(mt5001).eventType(TrackingEventType.BOOKING_REQUESTED).actorRole("customer").location("Nagpur, MH").build());
        em.persist(TrackingEvent.builder().id("ev_2").booking(mt5001).eventType(TrackingEventType.BOOKING_ACCEPTED).actorRole("driver").location("Nagpur, MH").build());
        em.persist(TrackingEvent.builder().id("ev_3").booking(mt5001).eventType(TrackingEventType.DIGITAL_RECORD_GENERATED).actorRole("system").build());
        em.persist(TrackingEvent.builder().id("ev_4").booking(mt5001).eventType(TrackingEventType.PICKUP_CONFIRMED).actorRole("driver").location("Nagpur, MH").build());
        em.persist(TrackingEvent.builder().id("ev_5").booking(mt5001).eventType(TrackingEventType.IN_TRANSIT).actorRole("driver").location("Nagpur, MH").build());

        // 7. Bills
        em.persist(Bill.builder()
                .id("bl_9001")
                .booking(mt5001)
                .driver(drv1)
                .freightAmount(21000.0)
                .tollCharges(640.0)
                .otherCharges(150.0)
                .status(BillStatus.PENDING)
                .build());

        // 8. Trip Photo
        em.persist(TripPhoto.builder()
                .id("tp_1")
                .booking(mt5001)
                .type("pickup")
                .label("Cotton bales loaded — Nagpur warehouse")
                .reviewStatus("approved")
                .build());

        em.flush();
        logger.info("LoadLink demo data seeding complete via EntityManager! Ready for full-stack road logistics operations.");
    }

    private void ensureAdmin(String email, String rawPassword, String name, String phone) {
        List<User> existing = em.createQuery("SELECT u FROM User u WHERE u.email = :email", User.class)
                .setParameter("email", email)
                .getResultList();
        if (existing.isEmpty()) {
            User admin = User.builder()
                    .id("u_" + UUID.randomUUID().toString().substring(0, 8))
                    .name(name)
                    .email(email)
                    .password(passwordEncoder.encode(rawPassword))
                    .phone(phone)
                    .role(UserRole.ADMIN)
                    .build();
            em.persist(admin);
            logger.info("Created LoadLink Admin account: {}", email);
        }
    }
}
