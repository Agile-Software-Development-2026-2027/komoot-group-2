package com.myway.backend.service.exceptions;

public class CannotReportOwnRouteException extends RuntimeException {
    public CannotReportOwnRouteException() {
        super("You cannot report your own route.");
    }
}