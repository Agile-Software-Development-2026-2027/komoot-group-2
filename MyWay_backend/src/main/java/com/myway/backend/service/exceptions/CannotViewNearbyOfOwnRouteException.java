package com.myway.backend.service.exceptions;

public class CannotViewNearbyOfOwnRouteException extends RuntimeException {
    public CannotViewNearbyOfOwnRouteException() {
        super("You cannot view nearby waypoints of your own route.");
    }
}