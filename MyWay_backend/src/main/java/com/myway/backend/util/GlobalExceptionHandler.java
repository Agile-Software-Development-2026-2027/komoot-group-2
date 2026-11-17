package com.myway.backend.util;

import com.myway.backend.service.exceptions.InvalidWaypointException;
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
import com.myway.backend.service.exceptions.EmailAlreadyUsedException;
import com.myway.backend.service.exceptions.InvalidCredentialsException;
import com.myway.backend.service.exceptions.UserNotFoundException;
import com.myway.backend.service.exceptions.RouteNotFoundException;
import com.myway.backend.service.exceptions.InvalidRouteException;
import com.myway.backend.service.exceptions.AlreadyReportedException;
import com.myway.backend.service.exceptions.CannotReportOwnRouteException;


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

    @ExceptionHandler(EmailAlreadyUsedException.class)
    public ResponseEntity<ErrorResponse> handleEmailAlreadyUsed(EmailAlreadyUsedException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCredentials(InvalidCredentialsException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(InvalidWaypointException.class)
    public ResponseEntity<ErrorResponse> handleInvalidWaypointException(InvalidWaypointException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(RouteNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleRouteNotFound(RouteNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(InvalidRouteException.class)
    public ResponseEntity<ErrorResponse> handleInvalidRoute(InvalidRouteException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(AlreadyReportedException.class)
    public ResponseEntity<ErrorResponse> handleAlreadyReported(AlreadyReportedException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(CannotReportOwnRouteException.class)
    public ResponseEntity<ErrorResponse> handleCannotReportOwn(CannotReportOwnRouteException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(e.getMessage()));
    }
}
