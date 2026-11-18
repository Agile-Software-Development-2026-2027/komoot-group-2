package com.myway.backend.util;

import com.myway.backend.util.GeoUtils.BoundingBox;
import com.myway.backend.util.GeoUtils.GeoPoint;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GeoUtilsTest {

    // 0.001 degrees of latitude (or of longitude at the equator) is about 111.2 m
    private static final double MILLI_DEGREE_METERS = 111.195;

    @Test
    void pointBesideTheMiddleOfASegment() {
        double d = GeoUtils.distanceToSegmentMeters(0.001, 0.005, 0, 0, 0, 0.01);
        assertEquals(MILLI_DEGREE_METERS, d, 0.5);
    }

    @Test
    void pointBeyondTheEndOfASegmentMeasuresToTheEndpoint() {
        double d = GeoUtils.distanceToSegmentMeters(0, 0.011, 0, 0, 0, 0.01);
        assertEquals(MILLI_DEGREE_METERS, d, 0.5);
    }

    @Test
    void pointOnTheSegmentIsAtZero() {
        double d = GeoUtils.distanceToSegmentMeters(0, 0.004, 0, 0, 0, 0.01);
        assertEquals(0.0, d, 0.01);
    }

    @Test
    void degenerateSegmentIsAPoint() {
        double d = GeoUtils.distanceToSegmentMeters(0.001, 0, 0, 0, 0, 0);
        assertEquals(MILLI_DEGREE_METERS, d, 0.5);
    }

    @Test
    void polylineTakesTheNearestSegment() {
        List<GeoPoint> track = List.of(
                new GeoPoint(0, 0), new GeoPoint(0, 0.01), new GeoPoint(0.01, 0.01));
        // Next to the second (vertical) segment, 0.002 deg east of it
        double d = GeoUtils.distanceToPolylineMeters(0.005, 0.012, track);
        assertEquals(2 * MILLI_DEGREE_METERS, d, 1.0);
    }

    @Test
    void emptyPolylineIsInfinitelyFar() {
        assertEquals(Double.POSITIVE_INFINITY, GeoUtils.distanceToPolylineMeters(1, 1, List.of()));
    }

    @Test
    void boundingBoxContainsEverythingWithinTheMargin() {
        List<GeoPoint> track = List.of(new GeoPoint(41.9, 12.5), new GeoPoint(42.0, 12.6));
        BoundingBox box = GeoUtils.boundingBox(track, 1000);

        assertTrue(box.minLatitude() < 41.9 - 0.008);
        assertTrue(box.maxLatitude() > 42.0 + 0.008);
        assertTrue(box.minLongitude() < 12.5 - 0.008);
        assertTrue(box.maxLongitude() > 12.6 + 0.008);
    }
}