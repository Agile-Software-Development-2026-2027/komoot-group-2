package com.myway.backend.controller;

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

    // POST /api/routes -> Salva una rotta associandola a una cartella
    @PostMapping
    public ResponseEntity<SavedRoute> saveRoute(@RequestParam Long folderId, @RequestParam String routeName) {
        SavedRoute newRoute = savedRouteService.saveRouteToFolder(folderId, routeName);
        return ResponseEntity.ok(newRoute);
    }

    // GET /api/routes?folderId=... -> Restituisce tutte le rotte di quella cartella
    @GetMapping
    public ResponseEntity<List<SavedRoute>> getRoutesByFolder(@RequestParam Long folderId) {
        List<SavedRoute> routes = savedRouteService.getRoutesByFolderId(folderId);
        return ResponseEntity.ok(routes);
    }
}