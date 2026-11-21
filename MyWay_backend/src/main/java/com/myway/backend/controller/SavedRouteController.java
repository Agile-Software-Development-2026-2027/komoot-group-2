package com.myway.backend.controller;

import com.myway.backend.dto.gpx.SaveRouteRequestDTO;
import com.myway.backend.model.SavedRoute;
import com.myway.backend.service.folder.SavedRouteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/routes")
public class SavedRouteController {

    private final SavedRouteService savedRouteService;

    public SavedRouteController(SavedRouteService savedRouteService) {
        this.savedRouteService = savedRouteService;
    }

    // POST /api/routes -> save a route (with points) in a folder
    @PostMapping
    public ResponseEntity<SavedRoute> saveRoute(@RequestBody SaveRouteRequestDTO request) {
        return ResponseEntity.ok(savedRouteService.saveRouteToFolder(request));
    }

    // GET /api/routes?folderId=... -> all routes of a folder
    @GetMapping
    public ResponseEntity<List<SavedRoute>> getRoutesByFolder(@RequestParam Long folderId) {
        return ResponseEntity.ok(savedRouteService.getRoutesByFolderId(folderId));
    }

    // GET /api/routes/{id} -> a single route
    @GetMapping("/{id}")
    public ResponseEntity<SavedRoute> getRouteById(@PathVariable Long id) {
        return ResponseEntity.ok(savedRouteService.getRouteById(id));
    }
}