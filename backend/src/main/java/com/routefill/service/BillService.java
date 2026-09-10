package com.routefill.service;

import com.routefill.dto.request.SubmitBillRequest;
import com.routefill.dto.response.BillDto;
import com.routefill.entity.Bill;
import com.routefill.entity.BookingRequest;
import com.routefill.entity.User;
import com.routefill.enums.BillStatus;
import com.routefill.exception.BadRequestException;
import com.routefill.exception.ResourceNotFoundException;
import com.routefill.repository.BillRepository;
import com.routefill.repository.BookingRequestRepository;
import com.routefill.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillService {
    private final BillRepository billRepository;
    private final BookingRequestRepository bookingRequestRepository;
    private final UserRepository userRepository;
    private final BookingService bookingService;

    @Transactional
    public BillDto submitBill(String bookingId, String driverId, SubmitBillRequest req) {
        BookingRequest booking = bookingRequestRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new BadRequestException("Driver not found"));

        Bill bill = Bill.builder()
                .id("bl_" + UUID.randomUUID().toString().substring(0, 8))
                .booking(booking)
                .driver(driver)
                .freightAmount(req.getFreightAmount() != null ? req.getFreightAmount() : booking.getPrice())
                .tollCharges(req.getTollCharges() != null ? req.getTollCharges() : 0.0)
                .otherCharges(req.getOtherCharges() != null ? req.getOtherCharges() : 0.0)
                .status(BillStatus.PENDING)
                .build();

        billRepository.save(bill);
        return toDto(bill);
    }

    @Transactional(readOnly = true)
    public List<BillDto> getBillsForDriver(String driverId) {
        return billRepository.findByDriverIdOrderByCreatedAtDesc(driverId).stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BillDto> getPendingBillQueue() {
        return billRepository.findByStatusOrderByCreatedAtDesc(BillStatus.PENDING).stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public void decideBill(String billId, String decision) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found"));

        if ("approved".equalsIgnoreCase(decision)) {
            bill.setStatus(BillStatus.APPROVED);
        } else if ("rejected".equalsIgnoreCase(decision)) {
            bill.setStatus(BillStatus.REJECTED);
        }
        billRepository.save(bill);
    }

    private BillDto toDto(Bill b) {
        return BillDto.builder()
                .id(b.getId())
                .matchId(b.getBooking().getId())
                .freightAmount(b.getFreightAmount())
                .tollCharges(b.getTollCharges())
                .otherCharges(b.getOtherCharges())
                .totalAmount(b.getFreightAmount() + (b.getTollCharges() != null ? b.getTollCharges() : 0.0) + (b.getOtherCharges() != null ? b.getOtherCharges() : 0.0))
                .status(b.getStatus().name().toLowerCase())
                .submittedBy(b.getDriver().getId())
                .createdAt(b.getCreatedAt() != null ? b.getCreatedAt().toString() : null)
                .match(bookingService.enrichBooking(b.getBooking()))
                .build();
    }
}
