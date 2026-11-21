package com.myway.backend.service.exceptions;

public abstract sealed class RoutingException extends RuntimeException
        permits PointTooFarFromRoadException, NoRouteFoundException, RoutingUnavailableException {

    protected RoutingException(String message) {
        super(message);
    }
}
