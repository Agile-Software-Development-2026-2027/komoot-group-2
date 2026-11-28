package com.myway.backend.service.statistics;

import com.myway.backend.dto.gpx.PointDTO;
import com.myway.backend.dto.statistics.UserStatisticsDTO;
import com.myway.backend.model.*;
import com.myway.backend.model.enums.Difficulty;
import com.myway.backend.model.enums.RouteCategory;
import com.myway.backend.model.enums.WaypointCategory;
import com.myway.backend.repository.SavedRouteRepository;
import com.myway.backend.service.route.RouteGpxReader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StatisticsServiceUserStatsTest {

    private static final String EMAIL = "a@x.it";

    @Mock private SavedRouteRepository savedRouteRepository;
    @Mock private RouteGpxReader gpxReader;
    private StatisticsServiceImpl service;
    private Folder folder;

    @BeforeEach
    void setUp() {
        service = new StatisticsServiceImpl(savedRouteRepository, gpxReader);
        folder = new Folder("f", EMAIL);
    }

    private static Route route(int id, RouteCategory cat, Difficulty diff, Integer minutes, Double length) {
        return Route.builder().id(id).name("r" + id).gpxPath("r" + id + ".gpx").category(cat).difficulty(diff)
                .estimatedTimeInMinutes(minutes).lengthInMeters(length).build();
    }

    private SavedRoute saved(Route route, Waypoint... waypoints) {
        SavedRoute s = new SavedRoute("s", folder, route);
        for (Waypoint w : waypoints) s.getPoints().add(new RoutePoint("w", w, s));
        return s;
    }

    private static Waypoint waypoint(int id, WaypointCategory... cats) {
        return Waypoint.builder().id(id).categories(new LinkedHashSet<>(Set.of(cats))).build();
    }

    private static PointDTO point(Double ele) {
        return new PointDTO(0.0, 0.0, ele, null);
    }

    @Test
    void noSavedRoutes_returnsEmptyStatistics() {
        when(savedRouteRepository.findByFolderUserEmail(EMAIL)).thenReturn(List.of());

        UserStatisticsDTO stats = service.getUserStatistics(EMAIL);

        assertEquals(0, stats.getTripCount());
        assertEquals(0, stats.getTotalDurationSeconds());
        assertEquals(0.0, stats.getTotalDistanceMeters());
        assertTrue(stats.getRouteTypes().isEmpty());
    }

    @Test
    void sumsDistanceAndCountsCategoriesDifficultiesAndWaypoints() {
        Route r1 = route(1, RouteCategory.HIKING, Difficulty.EASY, 60, 1000.0);
        Route r2 = route(2, RouteCategory.CYCLING, Difficulty.HARD, 30, 2500.0);
        when(savedRouteRepository.findByFolderUserEmail(EMAIL)).thenReturn(List.of(
                saved(r1, waypoint(1, WaypointCategory.PEAK, WaypointCategory.FOUNTAIN)),
                saved(r2, waypoint(2, WaypointCategory.PEAK))));
        when(gpxReader.readDurationSeconds(anyString())).thenReturn(Optional.empty());
        when(gpxReader.readPoints(anyString())).thenReturn(List.of());

        UserStatisticsDTO stats = service.getUserStatistics(EMAIL);

        assertEquals(2, stats.getTripCount());
        assertEquals(3500.0, stats.getTotalDistanceMeters());
        assertEquals(1, stats.getRouteTypes().get("HIKING"));
        assertEquals(1, stats.getRouteTypes().get("CYCLING"));
        assertEquals(1, stats.getDifficulties().get("EASY"));
        assertEquals(1, stats.getDifficulties().get("HARD"));
        assertEquals(2, stats.getWaypointCategories().get("PEAK"));
        assertEquals(1, stats.getWaypointCategories().get("FOUNTAIN"));
    }

    @Test
    void sameRouteSavedInTwoFolders_countsOnce() {
        Route r = route(1, RouteCategory.HIKING, Difficulty.EASY, 10, 500.0);
        when(savedRouteRepository.findByFolderUserEmail(EMAIL)).thenReturn(List.of(saved(r), saved(r)));
        when(gpxReader.readDurationSeconds(anyString())).thenReturn(Optional.empty());
        when(gpxReader.readPoints(anyString())).thenReturn(List.of());

        UserStatisticsDTO stats = service.getUserStatistics(EMAIL);

        assertEquals(1, stats.getTripCount());
        assertEquals(500.0, stats.getTotalDistanceMeters());
        assertEquals(600, stats.getTotalDurationSeconds());
    }

    @Test
    void duration_usesGpxTimesWhenPresent_otherwiseEstimate() {
        Route withTimes = route(1, RouteCategory.HIKING, Difficulty.EASY, 999, 1.0);
        Route withoutTimes = route(2, RouteCategory.HIKING, Difficulty.EASY, 10, 1.0);
        when(savedRouteRepository.findByFolderUserEmail(EMAIL)).thenReturn(List.of(saved(withTimes), saved(withoutTimes)));
        when(gpxReader.readDurationSeconds("r1.gpx")).thenReturn(Optional.of(120L));
        when(gpxReader.readDurationSeconds("r2.gpx")).thenReturn(Optional.empty());
        when(gpxReader.readPoints(anyString())).thenReturn(List.of());

        assertEquals(120 + 600, service.getUserStatistics(EMAIL).getTotalDurationSeconds());
    }

    @Test
    void elevation_isMaxMinusMinOfGpx_ignoringMissingElevations() {
        Route r = route(1, RouteCategory.HIKING, Difficulty.EASY, null, 1.0);
        when(savedRouteRepository.findByFolderUserEmail(EMAIL)).thenReturn(List.of(saved(r)));
        when(gpxReader.readDurationSeconds(anyString())).thenReturn(Optional.empty());
        when(gpxReader.readPoints("r1.gpx")).thenReturn(List.of(point(100.0), point(null), point(350.0), point(200.0)));

        UserStatisticsDTO stats = service.getUserStatistics(EMAIL);

        assertEquals(250.0, stats.getTotalElevationGainMeters());
        assertEquals(0, stats.getTotalDurationSeconds());
    }

    @Test
    void unreadableGpx_fallsBackToStoredLengthAndZeroElevation() {
        Route r = route(1, RouteCategory.HIKING, Difficulty.EASY, 5, 800.0);
        when(savedRouteRepository.findByFolderUserEmail(EMAIL)).thenReturn(List.of(saved(r)));
        when(gpxReader.readDurationSeconds(anyString())).thenReturn(Optional.empty());
        when(gpxReader.readPoints(anyString())).thenThrow(new IllegalStateException("bad gpx"));

        UserStatisticsDTO stats = service.getUserStatistics(EMAIL);

        assertEquals(800.0, stats.getTotalDistanceMeters());
        assertEquals(0.0, stats.getTotalElevationGainMeters());
        assertEquals(300, stats.getTotalDurationSeconds());
    }
}
