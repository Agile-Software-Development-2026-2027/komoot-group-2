package com.myway.backend.service.routing;

import com.myway.backend.dto.routing.RoutingRequestDTO;
import com.myway.backend.dto.routing.RoutingResponseDTO;
import com.myway.backend.graph.PathFinder;
import com.myway.backend.graph.RoadGraph;
import com.myway.backend.graph.RoadGraphLoader;
import com.myway.backend.graph.RoadNetwork;
import com.myway.backend.graph.RoadPath;
import com.myway.backend.graph.RoadSnap;
import com.myway.backend.service.exceptions.NoRouteFoundException;
import com.myway.backend.service.exceptions.PointTooFarFromRoadException;
import com.myway.backend.util.GeoUtils;
import com.myway.backend.util.GeoUtils.GeoPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoutingService {

    private static final double MAX_SNAP_DISTANCE_METERS = 1000;
    private static final double SAME_POINT_METERS = 0.1;
    private static final double WALKING_SPEED_METERS_PER_SECOND = 4.0 * 1000 / 3600;

    private final RoadGraphLoader roadGraphLoader;

    public RoutingResponseDTO findRoute(RoutingRequestDTO request) {
        RoadNetwork network = roadGraphLoader.getNetwork();
        RoadGraph graph = network.graph();
        RoadSnap start = snap(network, request.getFromLat(), request.getFromLon());
        RoadSnap destination = snap(network, request.getToLat(), request.getToLon());
        RoadPath path = PathFinder.find(graph, start, destination).orElseThrow(NoRouteFoundException::new);

        List<GeoPoint> points = new ArrayList<>();
        addPoint(points, request.getFromLat(), request.getFromLon());
        addPoint(points, start.latitude(), start.longitude());
        for (int node : path.nodes()) {
            addPoint(points, graph.latitude(node), graph.longitude(node));
        }
        addPoint(points, destination.latitude(), destination.longitude());
        addPoint(points, request.getToLat(), request.getToLon());

        double distance = start.distanceMeters() + path.lengthMeters() + destination.distanceMeters();
        return RoutingResponseDTO.builder()
                .points(points)
                .distanceMeters(distance)
                .durationSeconds(distance / WALKING_SPEED_METERS_PER_SECOND)
                .build();
    }

    private static RoadSnap snap(RoadNetwork network, double latitude, double longitude) {
        return network.grid().nearest(latitude, longitude, MAX_SNAP_DISTANCE_METERS)
                .orElseThrow(PointTooFarFromRoadException::new);
    }

    private static void addPoint(List<GeoPoint> points, double latitude, double longitude) {
        if (!points.isEmpty()) {
            GeoPoint last = points.getLast();
            if (GeoUtils.haversineMeters(last.latitude(), last.longitude(), latitude, longitude) < SAME_POINT_METERS) {
                return;
            }
        }
        points.add(new GeoPoint(latitude, longitude));
    }
}
