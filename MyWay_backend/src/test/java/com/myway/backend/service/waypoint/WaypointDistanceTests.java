package com.myway.backend.service.waypoint;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WaypointDistanceTests {

    @Test
    void haversineMatchesKnownDistances() {
        // Milan -> Rome is ~477 km
        assertThat(WaypointServiceImpl.distanceKm(45.4642, 9.19, 41.9028, 12.4964)).isBetween(470.0, 485.0);
        assertThat(WaypointServiceImpl.distanceKm(45, 9, 45, 9)).isZero();
        // one degree of latitude is ~111 km
        assertThat(WaypointServiceImpl.distanceKm(0, 0, 1, 0)).isBetween(110.0, 112.0);
    }
}
