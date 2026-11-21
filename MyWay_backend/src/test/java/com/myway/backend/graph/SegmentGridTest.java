package com.myway.backend.graph;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SegmentGridTest {

    @Test
    void findsTheClosestPointInTheMiddleOfALongSegment() {
        RoadGraph graph = TestRoadGraphs.build(
                new double[][]{{41.000, 16.000}, {41.000, 16.030}},
                new int[][]{{0, 1}});
        SegmentGrid grid = new SegmentGrid(graph, 1);

        RoadSnap snap = grid.nearest(41.0005, 16.015, 1000).orElseThrow();

        assertEquals(0, snap.from());
        assertEquals(1, snap.to());
        assertEquals(0.5, snap.fraction(), 0.01);
        assertEquals(41.000, snap.latitude(), 1e-6);
        assertEquals(16.015, snap.longitude(), 1e-4);
        assertEquals(55.6, snap.distanceMeters(), 0.5);
    }

    @Test
    void ignoresSmallNetworksDisconnectedFromTheRest() {
        RoadGraph graph = TestRoadGraphs.build(
                new double[][]{{41.000, 16.000}, {41.000, 16.010}, {41.000, 16.020},
                        {41.003, 16.000}, {41.003, 16.010}},
                new int[][]{{0, 1}, {1, 2}, {3, 4}});
        SegmentGrid grid = new SegmentGrid(graph, 3);

        RoadSnap snap = grid.nearest(41.0025, 16.005, 1000).orElseThrow();

        assertEquals(0, snap.from());
        assertEquals(1, snap.to());
    }

    @Test
    void findsNothingFartherThanTheMaximumDistance() {
        RoadGraph graph = TestRoadGraphs.build(
                new double[][]{{41.000, 16.000}, {41.000, 16.010}},
                new int[][]{{0, 1}});
        SegmentGrid grid = new SegmentGrid(graph, 1);

        assertTrue(grid.nearest(41.02, 16.005, 1000).isEmpty());
    }
}
