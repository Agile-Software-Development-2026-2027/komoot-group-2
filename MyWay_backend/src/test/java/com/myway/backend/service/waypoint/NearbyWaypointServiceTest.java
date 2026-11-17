package com.myway.backend.service.waypoint;

import com.myway.backend.dto.waypoint.NearbyWaypointDTO;
import com.myway.backend.model.User;
import com.myway.backend.model.Waypoint;
import com.myway.backend.repository.WaypointRepository;
import com.myway.backend.util.GeoUtils.GeoPoint;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class NearbyWaypointServiceTest {

    private final WaypointRepository repository = mock(WaypointRepository.class);
    private final NearbyWaypointService service = new NearbyWaypointService(repository);

    // A track running east along the equator
    private final List<GeoPoint> track = List.of(new GeoPoint(0, 0), new GeoPoint(0, 0.1));

    private Waypoint waypoint(int id, double lat, double lon) {
        User publisher = mock(User.class);
        when(publisher.getUsername()).thenReturn("someone");
        return Waypoint.builder().id(id).publisher(publisher)
                .isPublic(true).latitude(lat).longitude(lon).build();
    }

    private void repositoryReturns(Waypoint... found) {
        when(repository.findVisiblePublicInBox(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(List.of(found));
    }

    @Test
    void keepsOnlyWaypointsWithinOneKilometre() {
        // ~0.005 deg = ~556 m (kept), ~0.02 deg = ~2.2 km (dropped)
        repositoryReturns(waypoint(1, 0.005, 0.05), waypoint(2, 0.02, 0.05));

        List<NearbyWaypointDTO> result = service.findNearTrack(track);

        assertEquals(1, result.size());
        assertEquals(1, result.get(0).getId());
        assertTrue(result.get(0).getDistanceMeters() > 540 && result.get(0).getDistanceMeters() < 570);
    }

    @Test
    void sortsByDistanceFromTheTrack() {
        repositoryReturns(waypoint(1, 0.008, 0.02), waypoint(2, 0.002, 0.05));

        List<NearbyWaypointDTO> result = service.findNearTrack(track);

        assertEquals(List.of(2, 1), result.stream().map(NearbyWaypointDTO::getId).toList());
    }

    @Test
    void emptyTrackFindsNothing() {
        assertTrue(service.findNearTrack(List.of()).isEmpty());
    }
}