package com.myway.backend.service.exceptions;

public final class RoutingUnavailableException extends RoutingException {
    public RoutingUnavailableException() {
        super("Route calculation is not available at the moment. Please try again later.");
    }
}
