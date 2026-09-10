package com.routefill.service;

import com.routefill.dto.response.DisputeDto;
import com.routefill.entity.BookingRequest;
import com.routefill.entity.Dispute;
import com.routefill.entity.User;
import com.routefill.enums.BookingStatus;
import com.routefill.enums.DisputeStatus;
import com.routefill.exception.ResourceNotFoundException;
import com.routefill.repository.BookingRequestRepository;
import com.routefill.repository.DisputeRepository;
import com.routefill.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DisputeService {
    private final DisputeRepository disputeRepository;
    private final BookingRequestRepository bookingRequestRepository;
    private final UserRepository userRepository;
    private final BookingService bookingService;

    @Transactional
    public DisputeDto raiseDispute(String bookingId, String userId, String reason) {
        BookingRequest booking = bookingRequestRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Dispute d = Dispute.builder()
                .id("ds_" + UUID.randomUUID().toString().substring(0, 8))
                .booking(booking)
                .raisedBy(user)
                .reason(reason)
                .status(DisputeStatus.OPEN)
                .build();

        disputeRepository.save(d);

        booking.setStatus(BookingStatus.DISPUTED);
        bookingRequestRepository.save(booking);

        return toDto(d);
    }

    public List<DisputeDto> getAllDisputes() {
        return disputeRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public void resolveDispute(String disputeId, String note) {
        Dispute d = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute not found"));

        d.setStatus(DisputeStatus.RESOLVED);
        d.setResolutionNote(note);
        disputeRepository.save(d);
    }

    private DisputeDto toDto(Dispute d) {
        return DisputeDto.builder()
                .id(d.getId())
                .matchId(d.getBooking().getId())
                .raisedBy(d.getRaisedBy().getId())
                .reason(d.getReason())
                .status(d.getStatus().name().toLowerCase())
                .resolutionNote(d.getResolutionNote())
                .createdAt(d.getCreatedAt() != null ? d.getCreatedAt().toString() : null)
                .match(bookingService.enrichBooking(d.getBooking()))
                .build();
    }
}
