package com.myway.backend.util;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// extends RuntimeException, so hide the Throwable internals (stack trace...) from the JSON body
@JsonIgnoreProperties({"stackTrace", "cause", "suppressed", "localizedMessage"})
public class ErrorResponse extends RuntimeException{
    public ErrorResponse(String message){
        super(message);
    }

}