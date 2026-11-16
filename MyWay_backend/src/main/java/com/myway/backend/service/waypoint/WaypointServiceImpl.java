package com.myway.backend.service.waypoint;

import com.myway.backend.dto.waypoint.PublishWaypointRequestDTO;
import com.myway.backend.dto.waypoint.WaypointDTO;
import com.myway.backend.model.User;
import com.myway.backend.model.Waypoint;
import com.myway.backend.repository.UserRepository;
import com.myway.backend.repository.WaypointRepository;
import com.myway.backend.service.exceptions.InvalidWaypointException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class WaypointServiceImpl implements WaypointService {

    static final String PICTURES_URL_PREFIX = "/api/waypoints/pictures/";
    private static final double EARTH_RADIUS_KM = 6371.0088;
    private static final long MAX_PHOTO_BYTES = 5L * 1024 * 1024;
    private static final Pattern DATA_URL = Pattern.compile("^data:(image/[a-z+]+);base64,(.+)$", Pattern.DOTALL);
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/png", "png", "image/jpeg", "jpg", "image/webp", "webp", "image/gif", "gif");

    private final WaypointRepository waypoints;
    private final UserRepository users;
    private final Path picturesDir;

    /**
     * @param uploadsDir the uploads folder; by default {@code ../uploads}, i.e. the project root when the backend
     *                   is started from MyWay_backend. Pictures go in its "waypoints" subfolder.
     */
    public WaypointServiceImpl(WaypointRepository waypoints, UserRepository users,
                               @Value("${myway.uploads-dir:../uploads}") String uploadsDir) {
        this.waypoints = waypoints;
        this.users = users;
        this.picturesDir = Path.of(uploadsDir, "waypoints").toAbsolutePath().normalize();
    }

    @Override
    @Transactional
    public WaypointDTO publish(String publisherEmail, PublishWaypointRequestDTO request) {
        User publisher = users.findById(publisherEmail)
                .orElseThrow(() -> new InvalidWaypointException("Unknown publisher."));

        // Decode everything first so an invalid photo leaves nothing on disk
        List<byte[]> images = new ArrayList<>();
        List<String> extensions = new ArrayList<>();
        for (String photo : request.getPhotos() == null ? List.<String>of() : request.getPhotos()) {
            Matcher m = DATA_URL.matcher(photo == null ? "" : photo);
            String extension = m.matches() ? EXTENSIONS.get(m.group(1)) : null;
            if (extension == null) {
                throw new InvalidWaypointException("Photos must be PNG, JPEG, WEBP or GIF images.");
            }
            byte[] bytes;
            try {
                bytes = Base64.getMimeDecoder().decode(m.group(2));
            } catch (IllegalArgumentException e) {
                throw new InvalidWaypointException("A photo is not valid base64.");
            }
            if (bytes.length > MAX_PHOTO_BYTES) {
                throw new InvalidWaypointException("A photo exceeds the 5 MB limit.");
            }
            images.add(bytes);
            extensions.add(extension);
        }

        Set<String> paths = new LinkedHashSet<>();
        try {
            Files.createDirectories(picturesDir);
            for (int i = 0; i < images.size(); i++) {
                String fileName = UUID.randomUUID() + "." + extensions.get(i);
                Files.write(picturesDir.resolve(fileName), images.get(i));
                paths.add(fileName);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Could not store the waypoint photos.", e);
        }

        Waypoint saved = waypoints.save(Waypoint.builder()
                .categories(new LinkedHashSet<>(request.getCategories()))
                .description(request.getDescription())
                .publisher(publisher)
                .isPublic(true)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .picturePaths(paths)
                .build());
        return toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WaypointDTO> findNearby(double latitude, double longitude, double radiusKm) {
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || radiusKm <= 0) {
            throw new InvalidWaypointException("Invalid search area.");
        }
        double latDelta = Math.toDegrees(radiusKm / EARTH_RADIUS_KM);
        double minLat = Math.max(-90, latitude - latDelta);
        double maxLat = Math.min(90, latitude + latDelta);
        // Near the poles the box spans every longitude
        double cosLat = Math.cos(Math.toRadians(Math.min(89.9, Math.abs(latitude) + latDelta)));
        double lonDelta = Math.min(180, Math.toDegrees(radiusKm / EARTH_RADIUS_KM) / Math.max(cosLat, 1e-6));
        double minLon = Math.max(-180, longitude - lonDelta);
        double maxLon = Math.min(180, longitude + lonDelta);

        return waypoints
                .findByIsPublicTrueAndLatitudeBetweenAndLongitudeBetween(minLat, maxLat, minLon, maxLon)
                .stream()
                .filter(w -> distanceKm(latitude, longitude, w.getLatitude(), w.getLongitude()) <= radiusKm)
                .map(this::toDto)
                .toList();
    }

    @Override
    public Resource loadPicture(String fileName) {
        Path file = picturesDir.resolve(fileName).normalize();
        // Reject path traversal: only direct children of the pictures folder are served
        if (!picturesDir.equals(file.getParent()) || !Files.isRegularFile(file)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Picture not found.");
        }
        return new PathResource(file);
    }

    /** Great-circle distance (haversine formula). */
    static double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
    }

    private WaypointDTO toDto(Waypoint w) {
        return WaypointDTO.builder()
                .id(w.getId())
                .categories(new LinkedHashSet<>(w.getCategories()))
                .description(w.getDescription())
                .latitude(w.getLatitude())
                .longitude(w.getLongitude())
                .photos(w.getPicturePaths().stream().map(p -> PICTURES_URL_PREFIX + p).toList())
                .publisher(w.getPublisher().getUsername())
                .build();
    }
}
