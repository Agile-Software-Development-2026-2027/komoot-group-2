package com.myway.backend.controller;

import com.myway.backend.dto.gpx.SaveRouteRequestDTO;
import com.myway.backend.model.SavedRoute;
import com.myway.backend.service.folder.SavedRouteService;
import com.myway.backend.util.LoginRequired;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Not under /api/routes: that path belongs to the published routes (RouteController)
@RestController
@RequestMapping("/api/saved-routes")
@RequiredArgsConstructor
public class SavedRouteController {

    private final SavedRouteService savedRouteService;

    // POST /api/saved-routes -> save a route (with points) in one of the user's folders
    @LoginRequired
    @PostMapping
    public ResponseEntity<SavedRoute> saveRoute(@RequestBody SaveRouteRequestDTO request, Authentication authentication) {
        SavedRoute saved = savedRouteService.saveRouteToFolder(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // GET /api/saved-routes?folderId=... -> all routes of one of the user's folders
    @LoginRequired
    @GetMapping
    public List<SavedRoute> getRoutesByFolder(@RequestParam Long folderId, Authentication authentication) {
        return savedRouteService.getRoutesByFolderId(folderId, authentication.getName());
    }

    // GET /api/saved-routes/{id} -> a single saved route of the user
    @LoginRequired
    @GetMapping("/{id}")
    public SavedRoute getRouteById(@PathVariable Long id, Authentication authentication) {
        return savedRouteService.getRouteById(id, authentication.getName());
    }
}
