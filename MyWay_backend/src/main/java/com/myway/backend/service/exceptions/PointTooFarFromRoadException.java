package com.myway.backend.service.exceptions;

public final class PointTooFarFromRoadException extends RoutingException {
    public PointTooFarFromRoadException() {
        super("A selected point is too far from any road or path. Pick a point closer to a road.");
    }
}
