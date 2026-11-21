package com.myway.backend.service.folder;


import com.myway.backend.dto.gpx.*;
import com.myway.backend.model.Folder;
import com.myway.backend.model.RoutePoint;
import com.myway.backend.model.SavedRoute;
import com.myway.backend.repository.FolderRepository;
import com.myway.backend.repository.SavedRouteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class SavedRouteService {

    private final SavedRouteRepository savedRouteRepository;
    private final FolderRepository folderRepository;

    public SavedRouteService(SavedRouteRepository savedRouteRepository,
                             FolderRepository folderRepository) {
        this.savedRouteRepository = savedRouteRepository;
        this.folderRepository = folderRepository;
    }

    // Save a new route (with its points) inside a folder
    @Transactional
    public SavedRoute saveRouteToFolder(SaveRouteRequestDTO request) {
        Folder folder = folderRepository.findById(request.getFolderId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Folder not found with ID: " + request.getFolderId()));

        SavedRoute route = new SavedRoute(request.getName(), folder);

        int order = 0;
        if (request.getPoints() != null) {
            for (PointDTO p : request.getPoints()) {
                route.getPoints().add(new RoutePoint(
                        p.getLatitude(), p.getLongitude(), p.getElevation(),
                        p.getName(), order++, route));
            }
        }
        return savedRouteRepository.save(route);
    }

    // All routes of a folder
    @Transactional(readOnly = true)
    public List<SavedRoute> getRoutesByFolderId(Long folderId) {
        return savedRouteRepository.findByFolderId(folderId);
    }

    // A single route by id (404 if missing)
    @Transactional(readOnly = true)
    public SavedRoute getRouteById(Long id) {
        return savedRouteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "route not found with ID: " + id));
    }
}