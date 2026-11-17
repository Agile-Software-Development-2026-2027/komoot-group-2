package com.myway.backend.service.exceptions;

public class AlreadyReportedException extends RuntimeException {
    public AlreadyReportedException() {
        super("You have already reported this route.");
    }
}