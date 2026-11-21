package com.myway.backend.service.routing;

import com.myway.backend.dto.routing.RoutingRequestDTO;
import com.myway.backend.dto.routing.RoutingResponseDTO;
import com.myway.backend.graph.RoadGraph;
import com.myway.backend.graph.RoadGraphLoader;
import com.myway.backend.graph.RoadNetwork;
import com.myway.backend.graph.SegmentGrid;
import com.myway.backend.graph.TestRoadGraphs;
import com.myway.backend.service.exceptions.PointTooFarFromRoadException;
import com.myway.backend.util.GeoUtils;
import com.myway.backend.util.GeoUtils.GeoPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RoutingServiceTest {

    private final RoadGraph graph = TestRoadGraphs.build(
            new double[][]{{41.000, 16.000}, {41.000, 16.010}, {41.000, 16.020}},
            new int[][]{{0, 1}, {1, 2}});
    private final RoadGraphLoader loader = mock(RoadGraphLoader.class);
    private final RoutingService service = new RoutingService(loader);

    @BeforeEach
    void setUp() {
        when(loader.getNetwork()).thenReturn(new RoadNetwork(graph, new SegmentGrid(graph, 1)));
    }

    @Test
    void routeStartsAndEndsExactlyOnTheClickedPoints() {
        RoutingResponseDTO route = service.findRoute(request(41.0005, 16.005, 41.0005, 16.015));

        List<GeoPoint> points = route.getPoints();
        assertEquals(new GeoPoint(41.0005, 16.005), points.getFirst());
        assertEquals(new GeoPoint(41.0005, 16.015), points.getLast());
        assertEquals(5, points.size());

        double connector = GeoUtils.haversineMeters(41.0005, 16.005, 41.000, 16.005);
        double onRoad = GeoUtils.haversineMeters(41.000, 16.005, 41.000, 16.015);
        assertEquals(2 * connector + onRoad, route.getDistanceMeters(), 1);
        assertEquals(route.getDistanceMeters() * 0.9, route.getDurationSeconds(), 0.01);
    }

    @Test
    void pointTooFarFromAnyRoadIsRejected() {
        assertThrows(PointTooFarFromRoadException.class,
                () -> service.findRoute(request(41.100, 16.005, 41.000, 16.015)));
    }

    private static RoutingRequestDTO request(double fromLat, double fromLon, double toLat, double toLon) {
        return RoutingRequestDTO.builder().fromLat(fromLat).fromLon(fromLon).toLat(toLat).toLon(toLon).build();
    }
}
