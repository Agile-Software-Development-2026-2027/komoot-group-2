package com.myway.backend.service.folder;

import com.myway.backend.dto.gpx.SaveRouteRequestDTO;
import com.myway.backend.dto.gpx.SavedRouteDTO;
import com.myway.backend.dto.route.RouteSummaryDTO;
import com.myway.backend.model.*;
import com.myway.backend.model.enums.Difficulty;
import com.myway.backend.model.enums.RouteCategory;
import com.myway.backend.repository.FolderRepository;
import com.myway.backend.repository.RouteRepository;
import com.myway.backend.repository.SavedRouteRepository;
import com.myway.backend.repository.WaypointRepository;
import com.myway.backend.service.route.RouteGpxReader;
import com.myway.backend.service.route.RouteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SavedRouteServiceTest {

    @Mock private SavedRouteRepository savedRouteRepository;
    @Mock private FolderRepository folderRepository;
    @Mock private RouteRepository routeRepository;
    @Mock private WaypointRepository waypointRepository;
    @Mock private RouteService routeService;
    @Mock private RouteGpxReader gpxReader;
    @InjectMocks private SavedRouteService service;

    private Folder folder;

    @BeforeEach
    void setUp() {
        folder = new Folder("f", "a@x.it");
        folder.setId(1L);
    }

    private static User user(String email) {
        return User.builder().email(email).username("u").password("h").build();
    }

    private static Route route(boolean isPublic, String publisherEmail) {
        return Route.builder().id(7).name("r").gpxPath("p.gpx").category(RouteCategory.HIKING)
                .difficulty(Difficulty.EASY).publisher(user(publisherEmail)).isPublic(isPublic).build();
    }

    private static Waypoint waypoint(boolean isPublic, String publisherEmail) {
        return Waypoint.builder().id(3).name("Fountain").latitude(1.0).longitude(2.0)
                .publisher(user(publisherEmail)).isPublic(isPublic).build();
    }

    private static SaveRouteRequestDTO request(List<Integer> waypointIds) {
        return new SaveRouteRequestDTO(1L, "Giro", 7, waypointIds);
    }

    @Test
    void savesOwnPrivateRouteWithWaypointsInOwnFolder() {
        when(folderRepository.findById(1L)).thenReturn(Optional.of(folder));
        when(routeRepository.findById(7)).thenReturn(Optional.of(route(false, "a@x.it")));
        when(waypointRepository.findById(3)).thenReturn(Optional.of(waypoint(false, "a@x.it")));
        when(savedRouteRepository.save(any(SavedRoute.class))).thenAnswer(i -> i.getArgument(0));
        when(routeService.toSummary(any(), anyBoolean())).thenReturn(RouteSummaryDTO.builder().id(7).build());

        SavedRouteDTO saved = service.saveRouteToFolder(request(List.of(3, 3)), "a@x.it");

        assertEquals("Giro", saved.getName());
        assertEquals(7, saved.getRoute().getId());
        assertEquals(1, saved.getWaypoints().size());
        assertEquals(3, saved.getWaypoints().get(0).getWaypointId());
    }

    @Test
    void canSaveSomeoneElsesPublicRoute() {
        when(folderRepository.findById(1L)).thenReturn(Optional.of(folder));
        when(routeRepository.findById(7)).thenReturn(Optional.of(route(true, "other@x.it")));
        when(savedRouteRepository.save(any(SavedRoute.class))).thenAnswer(i -> i.getArgument(0));
        when(routeService.toSummary(any(), anyBoolean())).thenReturn(RouteSummaryDTO.builder().id(7).build());

        assertDoesNotThrow(() -> service.saveRouteToFolder(request(null), "a@x.it"));
    }

    @Test
    void cannotSaveSomeoneElsesPrivateRoute() {
        when(folderRepository.findById(1L)).thenReturn(Optional.of(folder));
        when(routeRepository.findById(7)).thenReturn(Optional.of(route(false, "other@x.it")));

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> service.saveRouteToFolder(request(null), "a@x.it"));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatusCode());
        verify(savedRouteRepository, never()).save(any());
    }

    @Test
    void cannotSaveSomeoneElsesPrivateWaypoint() {
        when(folderRepository.findById(1L)).thenReturn(Optional.of(folder));
        when(routeRepository.findById(7)).thenReturn(Optional.of(route(true, "other@x.it")));
        when(waypointRepository.findById(3)).thenReturn(Optional.of(waypoint(false, "other@x.it")));

        assertThrows(ResponseStatusException.class, () -> service.saveRouteToFolder(request(List.of(3)), "a@x.it"));
        verify(savedRouteRepository, never()).save(any());
    }

    @Test
    void cannotSaveIntoSomeoneElsesFolder() {
        when(folderRepository.findById(1L)).thenReturn(Optional.of(folder));

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> service.saveRouteToFolder(request(null), "intruder@x.it"));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatusCode());
        verify(savedRouteRepository, never()).save(any());
    }

    @Test
    void cannotReadSomeoneElsesRoute() {
        SavedRoute saved = new SavedRoute("r", folder, route(false, "a@x.it"));
        when(savedRouteRepository.findById(5L)).thenReturn(Optional.of(saved));

        assertThrows(ResponseStatusException.class, () -> service.getRouteById(5L, "intruder@x.it"));
    }

    @Test
    void cannotListSomeoneElsesFolder() {
        when(folderRepository.findById(1L)).thenReturn(Optional.of(folder));

        assertThrows(ResponseStatusException.class, () -> service.getRoutesByFolderId(1L, "intruder@x.it"));
        verify(savedRouteRepository, never()).findByFolderId(any());
    }
}
