package com.myway.backend.service.statistics;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

import com.myway.backend.dto.gpx.PointDTO;
import com.myway.backend.dto.gpx.RouteDTO;
import com.myway.backend.dto.statistics.UserStatisticsDTO;
import com.myway.backend.model.Route;
import com.myway.backend.model.SavedRoute;
import com.myway.backend.model.Waypoint;
import com.myway.backend.repository.SavedRouteRepository;
import com.myway.backend.service.route.RouteGpxReader;

import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import io.jenetics.jpx.Point;
import io.jenetics.jpx.WayPoint;
import io.jenetics.jpx.geom.Geoid;

@Service
@RequiredArgsConstructor
public class StatisticsServiceImpl implements StatisticsService {

    private final SavedRouteRepository savedRouteRepository;
    private final RouteGpxReader gpxReader;

    @Override
    @Transactional(readOnly = true)
    public UserStatisticsDTO getUserStatistics(String userEmail) {
        // Group the saved entries by Route, so a route saved in several folders counts once
        Map<Integer, Route> routes = new LinkedHashMap<>();
        Map<Integer, Set<Waypoint>> waypoints = new HashMap<>();
        for (SavedRoute saved : savedRouteRepository.findByFolderUserEmail(userEmail)) {
            Route route = saved.getRoute();
            routes.putIfAbsent(route.getId(), route);
            Set<Waypoint> set = waypoints.computeIfAbsent(route.getId(), k -> new HashSet<>());
            saved.getPoints().forEach(p -> set.add(p.getWaypoint()));
        }

        long durationSeconds = 0;
        double distance = 0;
        double elevation = 0;
        Map<String, Integer> types = new LinkedHashMap<>();
        Map<String, Integer> difficulties = new LinkedHashMap<>();
        Map<String, Integer> waypointCategories = new LinkedHashMap<>();

        for (Route route : routes.values()) {
            // Start/end time of the GPX if present, otherwise the estimated time
            Long gpxSeconds = gpxReader.readDurationSeconds(route.getGpxPath()).orElse(null);
            if (gpxSeconds != null) {
                durationSeconds += gpxSeconds;
            } else if (route.getEstimatedTimeInMinutes() != null) {
                durationSeconds += route.getEstimatedTimeInMinutes() * 60L;
            }
            List<PointDTO> points = readPointsSafely(route);
            distance += route.getLengthInMeters() != null
                    ? route.getLengthInMeters()
                    : trackLength(RouteDTO.builder().name(route.getName()).points(points).build());
            elevation += elevationRange(points);
            types.merge(route.getCategory().name(), 1, Integer::sum);
            difficulties.merge(route.getDifficulty().name(), 1, Integer::sum);
            waypoints.get(route.getId()).forEach(w ->
                    w.getCategories().forEach(c -> waypointCategories.merge(c.name(), 1, Integer::sum)));
        }

        return UserStatisticsDTO.builder()
                .tripCount(routes.size())
                .totalDurationSeconds(durationSeconds)
                .totalDistanceMeters(distance)
                .totalElevationGainMeters(elevation)
                .routeTypes(types)
                .difficulties(difficulties)
                .waypointCategories(waypointCategories)
                .build();
    }

    /** Highest minus lowest elevation of the GPX points (0 when there is no elevation data). */
    private double elevationRange(List<PointDTO> points) {
        double max = Double.NEGATIVE_INFINITY;
        double min = Double.POSITIVE_INFINITY;
        for (PointDTO p : points) {
            if (p.getElevation() == null) continue;
            max = Math.max(max, p.getElevation());
            min = Math.min(min, p.getElevation());
        }
        return max < min ? 0.0 : max - min;
    }

    private List<PointDTO> readPointsSafely(Route route) {
        try {
            return gpxReader.readPoints(route.getGpxPath());
        } catch (RuntimeException e) {
            return List.of(); // missing/corrupted GPX file: skip its geometry-based data
        }
    }

    @Override
    public double elevationGain(PointDTO start, PointDTO finish) {
        if (start == null || finish == null || start.getElevation() == null || finish.getElevation() == null) {
            return 0.0;
        }
        return finish.getElevation() - start.getElevation();
    }

    @Override
    public double trackLength(RouteDTO track) {
        if (track == null || track.getPoints() == null || track.getPoints().size() < 2) {
            return 0.0;
        }
        double totalDistanceMeters = 0.0;
        for (int i = 0; i < track.getPoints().size() - 1; i++) {
            // just because the WGS84.distance signature is for 2 Point (jpx object)
            Point p1 = convertToJPXPoint(track.getPoints().get(i));
            Point p2 = convertToJPXPoint(track.getPoints().get(i + 1));
            totalDistanceMeters += Geoid.WGS84.distance(p1, p2).doubleValue();
        }
        return totalDistanceMeters;
    }

    @Override
    public double straightLineTrackLength(RouteDTO track) {
        if (track == null || track.getPoints() == null || track.getPoints().isEmpty()) {
            return 0.0;
        }
        return Geoid.WGS84.distance(
            this.convertToJPXPoint(track.getPoints().getFirst()), 
            this.convertToJPXPoint(track.getPoints().getLast())
        ).doubleValue();
    }
    
    // helper that returns a Point (jpx)
    private Point convertToJPXPoint(PointDTO pointDTO) {
        return WayPoint.of(pointDTO.getLatitude(), pointDTO.getLongitude());
    }
}
