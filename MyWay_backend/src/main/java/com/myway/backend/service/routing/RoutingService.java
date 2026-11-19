package com.myway.backend.service.routing;

import com.myway.backend.dto.routing.RoutingRequestDTO;
import com.myway.backend.dto.routing.RoutingResponseDTO;
import com.myway.backend.service.exceptions.RoutingUnavailableException;
import org.springframework.stereotype.Service;

@Service
public class RoutingService {

    public RoutingResponseDTO findRoute(RoutingRequestDTO request) {
        throw new RoutingUnavailableException();
    }
}
