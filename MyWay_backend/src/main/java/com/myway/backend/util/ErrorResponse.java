package com.myway.backend.util;

public class ErrorResponse extends RuntimeException{
    public ErrorResponse(String message){
        super(message);
    }

}