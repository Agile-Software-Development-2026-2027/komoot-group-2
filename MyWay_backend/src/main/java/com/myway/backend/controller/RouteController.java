package com.myway.backend.controller;

import com.myway.backend.dto.route.RouteSummaryDTO;
import com.myway.backend.model.enums.Difficulty;
import com.myway.backend.model.enums.RouteCategory;
import com.myway.backend.service.route.RouteService;
import com.myway.backend.util.LoginRequired;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.List;
import com.myway.backend.dto.route.RouteDetailsDTO;
import com.myway.backend.dto.waypoint.NearbyWaypointDTO;
import com.myway.backend.service.route.RouteNearbyWaypointsService;
import com.myway.backend.dto.route.NearbyRouteDTO;


@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;
    private final RouteNearbyWaypointsService nearbyWaypointsService;

    @LoginRequired
    @PostMapping(value = "/publish", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RouteSummaryDTO> publish(
            @RequestParam("name") String name,
            @RequestParam("category") RouteCategory category,
            @RequestParam("difficulty") Difficulty difficulty,
            @RequestParam("isPublic") boolean isPublic,
            @RequestParam(value = "distanceMeters", required = false) Double distanceMeters,
            @RequestParam(value = "estimatedTimeInMinutes", required = false) Integer estimatedTimeInMinutes,
            @RequestParam("gpxFile") MultipartFile gpxFile,
            @RequestParam(value = "picture", required = false) MultipartFile picture,
            Authentication authentication) {

        RouteSummaryDTO created = routeService.publish(
                authentication.getName(), name, category, difficulty, isPublic,
                distanceMeters, estimatedTimeInMinutes, gpxFile, picture);

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // No @LoginRequired: anyone can browse public routes
    @GetMapping("/public")
    public List<RouteSummaryDTO> getPublicRoutes() {
        return routeService.getVisiblePublicRoutes();
    }

    // No @LoginRequired: anyone can see the public routes near a position
    @GetMapping("/nearby")
    public List<NearbyRouteDTO> getNearbyRoutes(@RequestParam double lat,
                                                @RequestParam double lon,
                                                @RequestParam(defaultValue = "100") double radiusKm) {
        return routeService.findNearby(lat, lon, radiusKm);
    }

    @GetMapping("/{id}/picture")
    public ResponseEntity<Resource> getPicture(@PathVariable Integer id) {
        return pictureResponse(routeService.getVisiblePicturePath(id));
    }

    private ResponseEntity<Resource> pictureResponse(String path) {
        MediaType type = path.endsWith(".png") ? MediaType.IMAGE_PNG
                : path.endsWith(".webp") ? MediaType.parseMediaType("image/webp")
                : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok().contentType(type).body(new FileSystemResource(path));
    }

    @GetMapping("/public/{id}")
    public RouteDetailsDTO getPublicRouteDetails(@PathVariable Integer id) {
        return routeService.getVisibleRouteDetails(id);
    }

    // No @LoginRequired: reading is public, but the route's own publisher is refused (403)
    @GetMapping("/public/{id}/waypoints")
    public List<NearbyWaypointDTO> getWaypointsNearPublicRoute(@PathVariable Integer id,
                                                              Authentication authentication) {
        String email = authentication == null ? null : authentication.getName();
        return nearbyWaypointsService.getWaypointsNearRoute(id, email);
    }
    
    @LoginRequired
    @PostMapping("/{id}/report")
    public ResponseEntity<Void> reportRoute(@PathVariable Integer id, Authentication authentication) {
        routeService.reportRoute(authentication.getName(), id);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @LoginRequired
    @GetMapping("/mine")
    public List<RouteSummaryDTO> getMyRoutes(Authentication authentication) {
        return routeService.getMyRoutes(authentication.getName());
    }

    @LoginRequired
    @GetMapping("/mine/{id}")
    public RouteDetailsDTO getMyRouteDetails(@PathVariable Integer id, Authentication authentication) {
        return routeService.getOwnRouteDetails(authentication.getName(), id);
    }

    @LoginRequired
    @GetMapping("/mine/{id}/picture")
    public ResponseEntity<Resource> getMyPicture(@PathVariable Integer id, Authentication authentication) {
        return pictureResponse(routeService.getOwnPicturePath(authentication.getName(), id));
    }

}