package com.myway.backend.service.folder;

import com.myway.backend.dto.gpx.PointDTO;
import com.myway.backend.dto.gpx.SaveRouteRequestDTO;
import com.myway.backend.model.Folder;
import com.myway.backend.model.RoutePoint;
import com.myway.backend.model.SavedRoute;
import com.myway.backend.repository.FolderRepository;
import com.myway.backend.repository.SavedRouteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Routes saved by a user into their own folders. Every operation checks that the folder belongs to the user. */
@Service
@RequiredArgsConstructor
public class SavedRouteService {

    private final SavedRouteRepository savedRouteRepository;
    private final FolderRepository folderRepository;

    @Transactional
    public SavedRoute saveRouteToFolder(SaveRouteRequestDTO request, String userEmail) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Route name must not be empty");
        }
        Folder folder = getOwnedFolder(request.getFolderId(), userEmail);

        SavedRoute route = new SavedRoute(request.getName().trim(), folder);
        int order = 0;
        if (request.getPoints() != null) {
            for (PointDTO p : request.getPoints()) {
                route.getPoints().add(new RoutePoint(
                        p.getLatitude(), p.getLongitude(), p.getElevation(), p.getName(), order++, route));
            }
        }
        return savedRouteRepository.save(route);
    }

    @Transactional(readOnly = true)
    public List<SavedRoute> getRoutesByFolderId(Long folderId, String userEmail) {
        getOwnedFolder(folderId, userEmail);
        return savedRouteRepository.findByFolderId(folderId);
    }

    @Transactional(readOnly = true)
    public SavedRoute getRouteById(Long id, String userEmail) {
        SavedRoute route = savedRouteRepository.findById(id).orElseThrow(this::routeNotFound);
        if (!route.getFolder().getUserEmail().equals(userEmail)) {
            throw routeNotFound(); // 404, so we do not reveal that the route exists
        }
        return route;
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
