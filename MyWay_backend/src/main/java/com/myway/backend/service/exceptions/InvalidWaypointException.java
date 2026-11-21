package com.myway.backend.service.exceptions;

public class InvalidWaypointException extends RuntimeException {
    public InvalidWaypointException(String message) {
        super(message);
    }
}
