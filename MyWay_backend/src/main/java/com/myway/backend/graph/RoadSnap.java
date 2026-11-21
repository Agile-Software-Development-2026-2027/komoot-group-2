package com.myway.backend.graph;

public record RoadSnap(int edge, int from, int to, double fraction,
                       double latitude, double longitude, double distanceMeters) {
}
