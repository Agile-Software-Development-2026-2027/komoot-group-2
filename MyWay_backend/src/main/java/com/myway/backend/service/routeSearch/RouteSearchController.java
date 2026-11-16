package com.myway.backend.service.routeSearch;

import com.myway.backend.dto.gpx.PagedRoutesDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteSearchController {

    private final RouteSearchService routeSearchService;

    @GetMapping("/public")
    public ResponseEntity<PagedRoutesDTO> getPublicRoutes(
            @RequestParam(name = "q", required = false) String query,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "5") int size) {
        return ResponseEntity.ok(routeSearchService.getPublicRoutes(query, page, size));
    }
}
