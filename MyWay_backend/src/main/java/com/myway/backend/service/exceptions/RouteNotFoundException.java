package com.myway.backend.service.exceptions;

public class RouteNotFoundException extends RuntimeException {
    public RouteNotFoundException() {
        super("Route not found.");
    }
}