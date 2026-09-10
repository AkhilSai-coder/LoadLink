package com.routefill.service;

import com.routefill.dto.request.CreateCargoLoadRequest;
import com.routefill.dto.response.CargoLoadDto;
import com.routefill.entity.CargoLoad;
import com.routefill.entity.User;
import com.routefill.enums.LoadStatus;
import com.routefill.exception.BadRequestException;
import com.routefill.exception.ResourceNotFoundException;
import com.routefill.mapper.EntityDtoMapper;
import com.routefill.repository.CargoLoadRepository;
import com.routefill.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CargoLoadService {
    private final CargoLoadRepository cargoLoadRepository;
    private final UserRepository userRepository;
    private final EntityDtoMapper mapper;

    public List<CargoLoadDto> getLoadsByCustomer(String customerId) {
        return cargoLoadRepository.findByCustomerIdOrderByCreatedAtDesc(customerId)
                .stream().map(mapper::toCargoLoadDto).collect(Collectors.toList());
    }

    public List<CargoLoadDto> getOpenLoads() {
        return cargoLoadRepository.findByStatusOrderByCreatedAtDesc(LoadStatus.OPEN)
                .stream().map(mapper::toCargoLoadDto).collect(Collectors.toList());
    }

    public CargoLoadDto getLoad(String id) {
        CargoLoad load = cargoLoadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cargo load not found with id: " + id));
        return mapper.toCargoLoadDto(load);
    }

    @Transactional
    public CargoLoadDto createLoad(String customerId, CreateCargoLoadRequest req) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new BadRequestException("Customer not found"));

        String loadId = "ld_" + UUID.randomUUID().toString().substring(0, 8);
        CargoLoad load = CargoLoad.builder()
                .id(loadId)
                .customer(customer)
                .material(req.getMaterial().trim())
                .weightTons(req.getWeightTons())
                .unit(req.getUnit() != null ? req.getUnit() : "T")
                .origin(req.getOrigin().trim())
                .destination(req.getDestination().trim())
                .pickupDate(req.getPickupDate())
                .budget(req.getBudget())
                .notes(req.getNotes())
                .status(req.isSaveAsDraft() ? LoadStatus.DRAFT : LoadStatus.OPEN)
                .build();

        cargoLoadRepository.save(load);
        return mapper.toCargoLoadDto(load);
    }

    @Transactional
    public CargoLoadDto publishLoad(String id) {
        CargoLoad load = cargoLoadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cargo load not found"));
        load.setStatus(LoadStatus.OPEN);
        cargoLoadRepository.save(load);
        return mapper.toCargoLoadDto(load);
    }

    @Transactional
    public void cancelLoad(String id) {
        CargoLoad load = cargoLoadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cargo load not found"));
        load.setStatus(LoadStatus.CANCELLED);
        cargoLoadRepository.save(load);
    }
}
