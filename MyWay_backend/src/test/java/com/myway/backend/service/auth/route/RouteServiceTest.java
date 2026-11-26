package com.myway.backend.service.route;
import com.myway.backend.dto.route.RouteSummaryDTO;
import com.myway.backend.model.Route;
import com.myway.backend.model.User;
import com.myway.backend.model.enums.Difficulty;
import com.myway.backend.model.enums.RouteCategory;
import com.myway.backend.repository.RouteRepository;
import com.myway.backend.repository.UserRepository;
import com.myway.backend.service.exceptions.InvalidRouteException;
import com.myway.backend.service.exceptions.UserNotFoundException;
import com.myway.backend.service.gpxParsing.GPXParsingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import com.myway.backend.repository.RouteReportRepository;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RouteServiceTest {

    private static final String EMAIL = "nada@test.com";

    private static final String VALID_GPX = """
            <?xml version="1.0" encoding="UTF-8"?>
            <gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
              <trk>
                <name>Test Track</name>
                <trkseg>
                  <trkpt lat="41.0" lon="13.0"><ele>100</ele></trkpt>
                  <trkpt lat="41.1" lon="13.1"><ele>120</ele></trkpt>
                </trkseg>
              </trk>
            </gpx>
            """;

    @TempDir
    Path tempDir;

    private RouteRepository routeRepository;
    private UserRepository userRepository;
    private RouteService routeService;

    @BeforeEach
    void setUp() {
        routeRepository = mock(RouteRepository.class);
        userRepository = mock(UserRepository.class);

        User user = User.builder().email(EMAIL).username("nada").password("secret").build();
        when(userRepository.findById(EMAIL)).thenReturn(Optional.of(user));

        // simulate the database: give the route an id when it is saved
        when(routeRepository.save(any(Route.class))).thenAnswer(inv -> {
            Route r = inv.getArgument(0);
            r.setId(1);
            return r;
        });

        RouteFileStorageService storage = new RouteFileStorageService(tempDir.toString());
        routeService = new RouteService(routeRepository, userRepository, new GPXParsingServiceImpl(), storage, new RouteGpxReader(), mock(RouteReportRepository.class));
    }

    @Test
    void publishValidRoute_savesRouteAndFile() throws IOException {
        RouteSummaryDTO result = routeService.publish(
                EMAIL, "  My Route  ", RouteCategory.HIKING, Difficulty.MEDIUM, true,
                5000.0, 90, gpx(VALID_GPX), null);

        ArgumentCaptor<Route> captor = ArgumentCaptor.forClass(Route.class);
        verify(routeRepository).save(captor.capture());
        Route saved = captor.getValue();

        assertEquals("My Route", saved.getName());
        assertEquals(EMAIL, saved.getPublisher().getEmail());
        assertTrue(saved.isPublic());
        assertEquals(5000.0, saved.getLengthInMeters());
        assertEquals(90, saved.getEstimatedTimeInMinutes());
        assertNull(saved.getPicturePath());
        assertEquals(41.0, saved.getStartLatitude(), 1e-9);
        assertEquals(13.0, saved.getStartLongitude(), 1e-9);

        // the stored path is absolute and the file really exists
        assertTrue(Path.of(saved.getGpxPath()).isAbsolute());
        assertTrue(Files.exists(Path.of(saved.getGpxPath())));

        // the response never contains email or file paths
        assertEquals("nada", result.getPublisherUsername());
        assertNull(result.getPictureUrl());
        assertFalse(result.isReported());
    }

    @Test
    void publishWithPicture_savesPicture() {
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
        MockMultipartFile picture = new MockMultipartFile("picture", "photo.png", "image/png", png);

        RouteSummaryDTO result = routeService.publish(
                EMAIL, "With Picture", RouteCategory.CYCLING, Difficulty.EASY, false,
                1000.0, 30, gpx(VALID_GPX), picture);

        ArgumentCaptor<Route> captor = ArgumentCaptor.forClass(Route.class);
        verify(routeRepository).save(captor.capture());
        String picturePath = captor.getValue().getPicturePath();

        assertNotNull(picturePath);
        assertTrue(Path.of(picturePath).isAbsolute());
        assertTrue(Files.exists(Path.of(picturePath)));
        assertEquals("/api/routes/1/picture", result.getPictureUrl());
    }

    @Test
    void publishInvalidGpx_isRejected_andNothingIsSaved() throws IOException {
        MockMultipartFile notGpx = new MockMultipartFile(
                "gpxFile", "route.gpx", "text/plain", "hello world".getBytes(StandardCharsets.UTF_8));

        assertThrows(InvalidRouteException.class, () -> routeService.publish(
                EMAIL, "Bad", RouteCategory.HIKING, Difficulty.EASY, true, 1.0, 1, notGpx, null));

        verify(routeRepository, never()).save(any());
        assertEquals(0, countFiles("gpx"));
    }

    @Test
    void publishBlankName_isRejected() {
        assertThrows(InvalidRouteException.class, () -> routeService.publish(
                EMAIL, "   ", RouteCategory.HIKING, Difficulty.EASY, true, 1.0, 1, gpx(VALID_GPX), null));

        verify(routeRepository, never()).save(any());
    }

    @Test
    void publishWhenDatabaseFails_removesStoredFiles() throws IOException {
        when(routeRepository.save(any(Route.class))).thenThrow(new RuntimeException("database down"));

        assertThrows(RuntimeException.class, () -> routeService.publish(
                EMAIL, "Will Fail", RouteCategory.HIKING, Difficulty.EASY, true, 1.0, 1, gpx(VALID_GPX), null));

        assertEquals(0, countFiles("gpx"));
    }

    @Test
    void publishWithUnknownUser_isRejected() {
        when(userRepository.findById("ghost@test.com")).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> routeService.publish(
                "ghost@test.com", "Route", RouteCategory.HIKING, Difficulty.EASY, true, 1.0, 1,
                gpx(VALID_GPX), null));

        verify(routeRepository, never()).save(any());
    }

    private MockMultipartFile gpx(String content) {
        return new MockMultipartFile("gpxFile", "route.gpx", "application/gpx+xml",
                content.getBytes(StandardCharsets.UTF_8));
    }

    private long countFiles(String subFolder) throws IOException {
        try (Stream<Path> files = Files.list(tempDir.resolve(subFolder))) {
            return files.count();
        }
    }
}