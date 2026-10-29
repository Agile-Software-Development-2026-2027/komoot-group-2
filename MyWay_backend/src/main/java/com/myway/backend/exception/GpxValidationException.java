package com.myway.backend.exception;
// Custom exception class for GPX validation errors
public class GpxValidationException extends RuntimeException {
    public GpxValidationException(String message) {
        super(message);
    }
}
