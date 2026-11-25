package com.myway.backend.service.route;

import com.myway.backend.dto.gpx.PointDTO;
import com.myway.backend.model.Route;
import com.myway.backend.model.User;
import com.myway.backend.repository.RouteRepository;
import com.myway.backend.service.exceptions.CannotViewNearbyOfOwnRouteException;
import com.myway.backend.service.exceptions.RouteNotFoundException;
import com.myway.backend.service.waypoint.NearbyWaypointService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RouteNearbyWaypointsServiceTest {

    private final RouteRepository routes = mock(RouteRepository.class);
    private final RouteGpxReader reader = mock(RouteGpxReader.class);
    private final NearbyWaypointService nearby = mock(NearbyWaypointService.class);
    private final RouteNearbyWaypointsService service =
            new RouteNearbyWaypointsService(routes, reader, nearby);

    private Route visibleRoute() {
        User publisher = mock(User.class);
        when(publisher.getEmail()).thenReturn("owner@test.com");
        Route route = Route.builder().id(7).gpxPath("x.gpx").publisher(publisher).isPublic(true).build();
        when(routes.findByIsPublicTrueAndReportsIsEmpty()).thenReturn(List.of(route));
        return route;
    }

    @Test
    void unknownOrHiddenRouteIsNotFound() {
        when(routes.findByIsPublicTrueAndReportsIsEmpty()).thenReturn(List.of());
        assertThrows(RouteNotFoundException.class, () -> service.getWaypointsNearRoute(7, null));
    }

    @Test
    void publisherIsRefused() {
        visibleRoute();
        assertThrows(CannotViewNearbyOfOwnRouteException.class,
                () -> service.getWaypointsNearRoute(7, "owner@test.com"));
    }

    @Test
    void anotherUserGetsTheWaypoints() {
        visibleRoute();
        when(reader.readPoints("x.gpx")).thenReturn(List.of(
                new PointDTO(0.0, 0.0, null, null), new PointDTO(0.0, 0.1, null, null)));

        service.getWaypointsNearRoute(7, "other@test.com");

        verify(nearby).findNearTrack(any());
    }
}