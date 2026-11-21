package com.myway.backend.controller;

import com.myway.backend.dto.routing.RoutingRequestDTO;
import com.myway.backend.dto.routing.RoutingResponseDTO;
import com.myway.backend.service.routing.RoutingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/routing")
@RequiredArgsConstructor
public class RoutingController {

    private final RoutingService routingService;

    @GetMapping
    public ResponseEntity<RoutingResponseDTO> route(@Valid @ModelAttribute RoutingRequestDTO request) {
        return ResponseEntity.ok(routingService.findRoute(request));
    }
}
