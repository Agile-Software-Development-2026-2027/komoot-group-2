package com.myway.backend.util;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpClientErrorException.BadRequest;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import com.myway.backend.exception.GpxValidationException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;


// Global Exception Handler, the @RestControllerAdvice annotation is just for listening on everything that get thrown
@RestControllerAdvice
public class GlobalExceptionHandler{

    // Just some templates
    @ExceptionHandler({ ResourceAccessException.class, NoHandlerFoundException.class})
    public ResponseEntity<ErrorResponse> handleNotFoundException(Exception e) {
           return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse("Resource not Found."));
    }

    @ExceptionHandler({ BadRequest.class, HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class, MethodArgumentNotValidException.class })
    public ResponseEntity<ErrorResponse> handleBadRequestException(Exception e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse("Bad Request."));
    }
       @ExceptionHandler(GpxValidationException.class)
    public ResponseEntity<ErrorResponse> handleGpxValidation(GpxValidationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(ex.getLocalizedMessage()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxSizeException(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("Error: File is too large! Maximum allowed size is 10MB."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("An unexpected server error occurred: " + ex.getMessage()));
    }

}