package com.myway.backend.graph;

import com.myway.backend.util.GeoUtils;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PathFinderTest {

    private final RoadGraph graph = TestRoadGraphs.build(
            new double[][]{{41.000, 16.000}, {41.000, 16.010}, {41.005, 16.010}, {41.000, 16.020}},
            new int[][]{{0, 1}, {1, 3}, {0, 2}, {2, 3}});
    private final SegmentGrid grid = new SegmentGrid(graph, 1);

    @Test
    void followsTheShortestRoadBetweenPointsInTheMiddleOfSegments() {
        RoadPath path = find(41.000, 16.005, 41.000, 16.015);

        assertArrayEquals(new int[]{1}, path.nodes());
        assertEquals(GeoUtils.haversineMeters(41.000, 16.005, 41.000, 16.015), path.lengthMeters(), 1);
    }

    @Test
    void worksInBothDirections() {
        RoadPath path = find(41.000, 16.015, 41.000, 16.005);

        assertArrayEquals(new int[]{1}, path.nodes());
        assertEquals(GeoUtils.haversineMeters(41.000, 16.005, 41.000, 16.015), path.lengthMeters(), 1);
    }

    @Test
    void staysOnTheSegmentWhenBothPointsAreOnIt() {
        RoadPath path = find(41.000, 16.002, 41.000, 16.007);

        assertArrayEquals(new int[0], path.nodes());
        assertEquals(GeoUtils.haversineMeters(41.000, 16.002, 41.000, 16.007), path.lengthMeters(), 1);
    }

    @Test
    void findsNothingBetweenDisconnectedRoads() {
        RoadGraph disconnected = TestRoadGraphs.build(
                new double[][]{{41.000, 16.000}, {41.000, 16.010}, {41.010, 16.000}, {41.010, 16.010}},
                new int[][]{{0, 1}, {2, 3}});
        SegmentGrid disconnectedGrid = new SegmentGrid(disconnected, 1);
        RoadSnap start = disconnectedGrid.nearest(41.000, 16.005, 1000).orElseThrow();
        RoadSnap destination = disconnectedGrid.nearest(41.010, 16.005, 1000).orElseThrow();

        assertTrue(PathFinder.find(disconnected, start, destination).isEmpty());
    }

    private RoadPath find(double fromLat, double fromLon, double toLat, double toLon) {
        RoadSnap start = grid.nearest(fromLat, fromLon, 1000).orElseThrow();
        RoadSnap destination = grid.nearest(toLat, toLon, 1000).orElseThrow();
        return PathFinder.find(graph, start, destination).orElseThrow();
    }
}
