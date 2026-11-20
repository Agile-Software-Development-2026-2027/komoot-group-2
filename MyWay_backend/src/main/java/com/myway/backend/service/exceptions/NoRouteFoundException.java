package com.myway.backend.service.exceptions;

public final class NoRouteFoundException extends RoutingException {
    public NoRouteFoundException() {
        super("No route found between the selected points.");
    }
}
