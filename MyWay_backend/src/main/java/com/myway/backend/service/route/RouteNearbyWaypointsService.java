package com.myway.backend.service.route;

import com.myway.backend.dto.gpx.PointDTO;
import com.myway.backend.dto.waypoint.NearbyWaypointDTO;
import com.myway.backend.model.Route;
import com.myway.backend.repository.RouteRepository;
import com.myway.backend.service.exceptions.CannotViewNearbyOfOwnRouteException;
import com.myway.backend.service.exceptions.RouteNotFoundException;
import com.myway.backend.service.waypoint.NearbyWaypointService;
import com.myway.backend.util.GeoUtils.GeoPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/** Waypoints near a public route that is visible and not owned by the requester. */
@Service
@RequiredArgsConstructor
public class RouteNearbyWaypointsService {

    private final RouteRepository routeRepository;
    private final RouteGpxReader gpxReader;
    private final NearbyWaypointService nearbyWaypointService;

    /** @param requesterEmail email of the logged-in user, or null for an anonymous visitor */
    public List<NearbyWaypointDTO> getWaypointsNearRoute(Integer routeId, String requesterEmail) {
        Route route = routeRepository.findByIsPublicTrueAndReportsIsEmpty().stream()
                .filter(r -> r.getId().equals(routeId))
                .findFirst()
                .orElseThrow(RouteNotFoundException::new);

        if (requesterEmail != null && route.getPublisher().getEmail().equals(requesterEmail)) {
            throw new CannotViewNearbyOfOwnRouteException();
        }

        List<GeoPoint> track = gpxReader.readPoints(route.getGpxPath()).stream()
                .map(p -> new GeoPoint(p.getLatitude(), p.getLongitude()))
                .toList();

        return nearbyWaypointService.findNearTrack(track);
    }
}