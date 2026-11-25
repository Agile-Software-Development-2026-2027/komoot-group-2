package com.myway.backend.service.folder;

import com.myway.backend.dto.gpx.SaveRouteRequestDTO;
import com.myway.backend.dto.gpx.SavedRouteDTO;
import com.myway.backend.model.Folder;
import com.myway.backend.model.Route;
import com.myway.backend.model.RoutePoint;
import com.myway.backend.model.SavedRoute;
import com.myway.backend.model.Waypoint;
import com.myway.backend.repository.FolderRepository;
import com.myway.backend.repository.RouteRepository;
import com.myway.backend.repository.SavedRouteRepository;
import com.myway.backend.repository.WaypointRepository;
import com.myway.backend.service.route.RouteGpxReader;
import com.myway.backend.service.route.RouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
import java.util.List;

/**
 * Routes saved by a user into their own folders. A saved route points to a Route (own or public) and its
 * waypoints to rows of the Waypoint table. Every operation checks that the folder belongs to the user.
 */
@Service
@RequiredArgsConstructor
public class SavedRouteService {

    private final SavedRouteRepository savedRouteRepository;
    private final FolderRepository folderRepository;
    private final RouteRepository routeRepository;
    private final WaypointRepository waypointRepository;
    private final RouteService routeService;
    private final RouteGpxReader gpxReader;

    @Transactional
    public SavedRouteDTO saveRouteToFolder(SaveRouteRequestDTO request, String userEmail) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Route name must not be empty");
        }
        if (request.getRouteId() == null || request.getFolderId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "folderId and routeId are required");
        }
        Folder folder = getOwnedFolder(request.getFolderId(), userEmail);
        Route route = getUsableRoute(request.getRouteId(), userEmail);

        SavedRoute saved = new SavedRoute(request.getName().trim(), folder, route);
        if (request.getWaypointIds() != null) {
            for (Integer waypointId : new LinkedHashSet<>(request.getWaypointIds())) {
                Waypoint waypoint = getUsableWaypoint(waypointId, userEmail);
                saved.getPoints().add(new RoutePoint(waypoint.getName(), waypoint, saved));
            }
        }
        return toDto(savedRouteRepository.save(saved), false);
    }

    @Transactional(readOnly = true)
    public List<SavedRouteDTO> getRoutesByFolderId(Long folderId, String userEmail) {
        getOwnedFolder(folderId, userEmail);
        return savedRouteRepository.findByFolderId(folderId).stream().map(r -> toDto(r, false)).toList();
    }

    @Transactional(readOnly = true)
    public SavedRouteDTO getRouteById(Long id, String userEmail) {
        SavedRoute route = savedRouteRepository.findById(id).orElseThrow(this::routeNotFound);
        if (!route.getFolder().getUserEmail().equals(userEmail)) {
            throw routeNotFound(); // 404, so we do not reveal that the route exists
        }
        return toDto(route, true);
    }

    private SavedRouteDTO toDto(SavedRoute saved, boolean withPoints) {
        Route route = saved.getRoute();
        return SavedRouteDTO.builder()
                .id(saved.getId())
                .name(saved.getName())
                .folderId(saved.getFolder().getId())
                .route(routeService.toSummary(route, false))
                .points(withPoints ? gpxReader.readPoints(route.getGpxPath()) : null)
                .waypoints(saved.getPoints().stream()
                        .map(p -> SavedRouteDTO.SavedWaypointDTO.builder()
                                .id(p.getId())
                                .name(p.getName())
                                .waypointId(p.getWaypoint().getId())
                                .latitude(p.getWaypoint().getLatitude())
                                .longitude(p.getWaypoint().getLongitude())
                                .build())
                        .toList())
                .build();
    }

    /** A route can be saved if the user published it or it is public. Otherwise 404. */
    private Route getUsableRoute(Integer routeId, String userEmail) {
        return routeRepository.findById(routeId)
                .filter(r -> r.isPublic() || r.getPublisher().getEmail().equals(userEmail))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found"));
    }

    private Waypoint getUsableWaypoint(Integer waypointId, String userEmail) {
        return waypointRepository.findById(waypointId)
                .filter(w -> w.isPublic() || w.getPublisher().getEmail().equals(userEmail))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Waypoint not found"));
    }

    private Folder getOwnedFolder(Long folderId, String userEmail) {
        return folderRepository.findById(folderId)
                .filter(f -> f.getUserEmail().equals(userEmail))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));
    }

    private ResponseStatusException routeNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found");
    }
}
