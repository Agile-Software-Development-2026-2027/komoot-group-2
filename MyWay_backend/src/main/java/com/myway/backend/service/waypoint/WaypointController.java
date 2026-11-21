package com.myway.backend.service.waypoint;

import com.myway.backend.dto.waypoint.PublishWaypointRequestDTO;
import com.myway.backend.dto.waypoint.WaypointDTO;
import com.myway.backend.util.LoginRequired;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/waypoints")
@RequiredArgsConstructor
public class WaypointController {

    private final WaypointService waypointService;

    /** Publishes a waypoint; the publisher is the logged-in user. */
    @LoginRequired
    @PostMapping
    public ResponseEntity<WaypointDTO> publish(Authentication authentication,
                                               @Valid @RequestBody PublishWaypointRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(waypointService.publish(authentication.getName(), request));
    }

    /** Public waypoints within radiusKm (default 200) of a point. Anyone can call it. */
    @GetMapping("/nearby")
    public List<WaypointDTO> nearby(@RequestParam double lat, @RequestParam double lon,
                                    @RequestParam(defaultValue = "200") double radiusKm) {
        return waypointService.findNearby(lat, lon, radiusKm);
    }



    @GetMapping("/pictures/{fileName:.+}")
    public ResponseEntity<Resource> picture(@PathVariable String fileName) {
        Resource picture = waypointService.loadPicture(fileName);
        MediaType type = MediaTypeFactory.getMediaType(picture).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
                .contentType(type)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                .header("X-Content-Type-Options", "nosniff")
                .body(picture);
    }
}
