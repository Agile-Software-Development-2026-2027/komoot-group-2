package com.myway.backend.service.waypoint;

import com.myway.backend.dto.waypoint.NearbyWaypointDTO;
import com.myway.backend.model.Waypoint;
import com.myway.backend.repository.WaypointRepository;
import com.myway.backend.util.GeoUtils;
import com.myway.backend.util.GeoUtils.BoundingBox;
import com.myway.backend.util.GeoUtils.GeoPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;

/** Finds the public, unreported waypoints within 1 km of a track. */
@Service
@RequiredArgsConstructor
public class NearbyWaypointService {

    public static final double NEARBY_TRACK_RADIUS_METERS = 1000;

    private final WaypointRepository waypoints;

    @Transactional(readOnly = true)
    public List<NearbyWaypointDTO> findNearTrack(List<GeoPoint> track) {
        if (track == null || track.isEmpty()) {
            return List.of();
        }

        BoundingBox box = GeoUtils.boundingBox(track, NEARBY_TRACK_RADIUS_METERS);

        return waypoints
                .findVisiblePublicInBox(box.minLatitude(), box.maxLatitude(),
                        box.minLongitude(), box.maxLongitude())
                .stream()
                .map(w -> toDto(w, GeoUtils.distanceToPolylineMeters(
                        w.getLatitude(), w.getLongitude(), track)))
                .filter(dto -> dto.getDistanceMeters() <= NEARBY_TRACK_RADIUS_METERS)
                .sorted(Comparator.comparingDouble(NearbyWaypointDTO::getDistanceMeters))
                .toList();
    }

    private NearbyWaypointDTO toDto(Waypoint w, double distanceMeters) {
        return NearbyWaypointDTO.builder()
                .id(w.getId())
                .categories(new LinkedHashSet<>(w.getCategories()))
                .name(w.getName())
                .description(w.getDescription())
                .latitude(w.getLatitude())
                .longitude(w.getLongitude())
                .photos(w.getPicturePaths().stream()
                        .map(p -> WaypointServiceImpl.PICTURES_URL_PREFIX + p).toList())
                .publisher(w.getPublisher().getUsername())
                .distanceMeters(Math.round(distanceMeters))
                .build();
    }
}