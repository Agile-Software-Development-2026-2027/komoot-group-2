package com.myway.backend.service.route;

import com.myway.backend.dto.gpx.GPXDataDTO;
import com.myway.backend.dto.route.RouteSummaryDTO;
import com.myway.backend.model.Route;
import com.myway.backend.model.User;
import com.myway.backend.model.enums.Difficulty;
import com.myway.backend.model.enums.RouteCategory;
import com.myway.backend.repository.RouteRepository;
import com.myway.backend.repository.UserRepository;
import com.myway.backend.service.exceptions.InvalidRouteException;
import com.myway.backend.service.exceptions.UserNotFoundException;
import com.myway.backend.service.gpxParsing.GPXParsingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.myway.backend.service.exceptions.RouteNotFoundException;
import java.util.List;
import com.myway.backend.dto.route.RouteDetailsDTO;
import com.myway.backend.model.RouteReport;
import com.myway.backend.repository.RouteReportRepository;
import com.myway.backend.service.exceptions.AlreadyReportedException;
import com.myway.backend.service.exceptions.CannotReportOwnRouteException;
import com.myway.backend.dto.gpx.PointDTO;
import com.myway.backend.dto.route.NearbyRouteDTO;
import com.myway.backend.util.GeoUtils;
import java.util.ArrayList;
import java.util.Comparator;

@Service
@RequiredArgsConstructor
public class RouteService {

    private static final int MAX_NAME_LENGTH = 255;
    private static final double MAX_NEARBY_RADIUS_KM = 100.0;

    private final RouteRepository routeRepository;
    private final UserRepository userRepository;
    private final GPXParsingService gpxParsingService;
    private final RouteFileStorageService storageService;
    private final RouteGpxReader gpxReader;
    private final RouteReportRepository reportRepository;


    /** Publishes a route. The publisher is always the authenticated user. */
    public RouteSummaryDTO publish(String publisherEmail,
                                   String name,
                                   RouteCategory category,
                                   Difficulty difficulty,
                                   boolean isPublic,
                                   Double distanceMeters,
                                   Integer estimatedTimeInMinutes,
                                   MultipartFile gpxFile,
                                   MultipartFile picture) {

        User publisher = userRepository.findById(publisherEmail)
                .orElseThrow(UserNotFoundException::new);

        validateMetadata(name, distanceMeters, estimatedTimeInMinutes);
        validateGpx(gpxFile);

        String gpxPath = null;
        String picturePath = null;
        try {
            gpxPath = storageService.saveGpx(gpxFile);
            if (picture != null && !picture.isEmpty()) {
                picturePath = storageService.savePicture(picture);
            }

            List<PointDTO> points = gpxReader.readPoints(gpxPath);
            Double startLatitude = points.isEmpty() ? null : points.getFirst().getLatitude();
            Double startLongitude = points.isEmpty() ? null : points.getFirst().getLongitude();

            Route route = Route.builder()
                    .name(name.trim())
                    .gpxPath(gpxPath)
                    .picturePath(picturePath)
                    .category(category)
                    .difficulty(difficulty)
                    .publisher(publisher)
                    .isPublic(isPublic)
                    .lengthInMeters(distanceMeters)
                    .estimatedTimeInMinutes(estimatedTimeInMinutes)
                    .startLatitude(startLatitude)
                    .startLongitude(startLongitude)
                    .lengthInMeters(distanceMeters)
                    .build();

            Route saved = routeRepository.save(route);
            return toSummary(saved, false);

        } catch (RuntimeException e) {
            // files and database do not share a transaction: remove files if anything failed
            storageService.deleteQuietly(gpxPath);
            storageService.deleteQuietly(picturePath);
            throw e;
        }
    }


     /** Public routes visible to everyone (public and never reported). */
    public List<RouteSummaryDTO> getVisiblePublicRoutes() {
        return routeRepository.findByIsPublicTrueAndReportsIsEmpty().stream()
                .map(route -> toSummary(route, false))
                .toList();
    }

    /** Visible public routes whose name contains the given text (case-insensitive). */
    public List<RouteSummaryDTO> searchPublicRoutes(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        return routeRepository
                .findByIsPublicTrueAndReportsIsEmptyAndNameContainingIgnoreCaseOrderByNameAsc(query.trim())
                .stream()
                .map(route -> toSummary(route, false))
                .toList();
    }

        /** Visible public routes whose start point is within radiusKm of the given position, nearest first. */
    public List<NearbyRouteDTO> findNearby(double lat, double lon, double radiusKm) {
        if (!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) {
            throw new InvalidRouteException("Invalid coordinates.");
        }
        if (!(radiusKm > 0 && radiusKm <= MAX_NEARBY_RADIUS_KM)) {
            throw new InvalidRouteException("The radius must be between 0 and " + (int) MAX_NEARBY_RADIUS_KM + " km.");
        }

        GeoUtils.BoundingBox box = GeoUtils.boundingBox(
                List.of(new GeoUtils.GeoPoint(lat, lon)), radiusKm * 1000);

        List<NearbyRouteDTO> result = new ArrayList<>();
        for (Route route : routeRepository.findByIsPublicTrueAndStartLatitudeBetweenAndStartLongitudeBetweenAndReportsIsEmpty(
                box.minLatitude(), box.maxLatitude(), box.minLongitude(), box.maxLongitude())) {
            double distanceKm = GeoUtils.haversineMeters(
                    lat, lon, route.getStartLatitude(), route.getStartLongitude()) / 1000.0;
            if (distanceKm <= radiusKm) {
                result.add(toNearby(route, distanceKm));
            }
        }
        result.sort(Comparator.comparingDouble(NearbyRouteDTO::getDistanceFromUserKm));
        return result;
    }

    private NearbyRouteDTO toNearby(Route route, double distanceKm) {
        return NearbyRouteDTO.builder()
                .id(route.getId())
                .name(route.getName())
                .category(route.getCategory().name())
                .difficulty(route.getDifficulty().name())
                .distanceMeters(route.getLengthInMeters())
                .estimatedTimeInMinutes(route.getEstimatedTimeInMinutes())
                .publisherUsername(route.getPublisher().getUsername())
                .pictureUrl(route.getPicturePath() == null ? null : "/api/routes/" + route.getId() + "/picture")
                .startLatitude(route.getStartLatitude())
                .startLongitude(route.getStartLongitude())
                .distanceFromUserKm(distanceKm)
                .build();
    }

    /** Returns the picture path only if the route is publicly visible. */
    public String getVisiblePicturePath(Integer routeId) {
        Route route = routeRepository.findByIsPublicTrueAndReportsIsEmpty().stream()
                .filter(r -> r.getId().equals(routeId))
                .findFirst()
                .orElseThrow(RouteNotFoundException::new);
        if (route.getPicturePath() == null) {
            throw new RouteNotFoundException();
        }
        return route.getPicturePath();
    }


    /** Details of a visible public route, including its points. */
    public RouteDetailsDTO getVisibleRouteDetails(Integer routeId) {
        Route route = routeRepository.findByIsPublicTrueAndReportsIsEmpty().stream()
                .filter(r -> r.getId().equals(routeId))
                .findFirst()
                .orElseThrow(RouteNotFoundException::new);
        return RouteDetailsDTO.builder()
                .route(toSummary(route, false))
                .points(gpxReader.readPoints(route.getGpxPath()))
                .build();
    }


    /** Reports a visible public route. One report is enough to hide it from other users. */
    public void reportRoute(String reporterEmail, Integer routeId) {
        User reporter = userRepository.findById(reporterEmail)
                .orElseThrow(UserNotFoundException::new);

        Route route = routeRepository.findByIsPublicTrueAndReportsIsEmpty().stream()
                .filter(r -> r.getId().equals(routeId))
                .findFirst()
                .orElseThrow(RouteNotFoundException::new);

        if (route.getPublisher().getEmail().equals(reporterEmail)) {
            throw new CannotReportOwnRouteException();
        }

        RouteReport.Id id = new RouteReport.Id(route.getId(), reporterEmail);
        if (reportRepository.existsById(id)) {
            throw new AlreadyReportedException();
        }
        reportRepository.save(new RouteReport(route, reporter));
    }

    /** All routes of the authenticated user, including private and reported ones. */
    public List<RouteSummaryDTO> getMyRoutes(String email) {
        return routeRepository.findByPublisherEmailOrderByIdDesc(email).stream()
                .map(route -> toSummary(route, reportRepository.countByRouteId(route.getId()) > 0))
                .toList();
    }

    /** Details of a route owned by the user, even if it is private or reported. */
    public RouteDetailsDTO getOwnRouteDetails(String email, Integer routeId) {
        Route route = routeRepository.findByIdAndPublisherEmail(routeId, email)
                .orElseThrow(RouteNotFoundException::new);
        boolean reported = reportRepository.countByRouteId(routeId) > 0;
        return RouteDetailsDTO.builder()
                .route(toSummary(route, reported))
                .points(gpxReader.readPoints(route.getGpxPath()))
                .build();
    }

    /** Picture path of a route owned by the user. */
    public String getOwnPicturePath(String email, Integer routeId) {
        Route route = routeRepository.findByIdAndPublisherEmail(routeId, email)
                .orElseThrow(RouteNotFoundException::new);
        if (route.getPicturePath() == null) {
            throw new RouteNotFoundException();
        }
        return route.getPicturePath();
    }


    /** Converts a route to a safe DTO (no email, no file paths). Publisher must be loaded. */
    public RouteSummaryDTO toSummary(Route route, boolean reported) {
        return RouteSummaryDTO.builder()
                .id(route.getId())
                .name(route.getName())
                .category(route.getCategory().name())
                .difficulty(route.getDifficulty().name())
                .distanceMeters(route.getLengthInMeters())
                .estimatedTimeInMinutes(route.getEstimatedTimeInMinutes())
                .publisherUsername(route.getPublisher().getUsername())
                .pictureUrl(route.getPicturePath() == null ? null : "/api/routes/" + route.getId() + "/picture")
                .publicRoute(route.isPublic())
                .reported(reported)
                .build();
    }

    private void validateMetadata(String name, Double distanceMeters, Integer estimatedTimeInMinutes) {
        if (name == null || name.isBlank()) {
            throw new InvalidRouteException("Route name must not be blank.");
        }
        if (name.trim().length() > MAX_NAME_LENGTH) {
            throw new InvalidRouteException("Route name is too long.");
        }
        if (distanceMeters != null && distanceMeters < 0) {
            throw new InvalidRouteException("Distance must not be negative.");
        }
        if (estimatedTimeInMinutes != null && estimatedTimeInMinutes < 0) {
            throw new InvalidRouteException("Estimated time must not be negative.");
        }
    }

    // The file must be parsable and contain at least 2 points
    private void validateGpx(MultipartFile gpxFile) {
        if (gpxFile == null || gpxFile.isEmpty()) {
            throw new InvalidRouteException("The GPX file is missing or empty.");
        }
        GPXDataDTO data;
        try {
            data = gpxParsingService.parseGPX(gpxFile);
        } catch (RuntimeException e) {
            throw new InvalidRouteException("The file is not a valid GPX file.");
        }
        int points = 0;
        if (data.getTracks() != null) {
            points += data.getTracks().stream().mapToInt(t -> t.getPoints().size()).sum();
        }
        if (data.getRoutes() != null) {
            points += data.getRoutes().stream().mapToInt(r -> r.getPoints().size()).sum();
        }
        if (points < 2) {
            throw new InvalidRouteException("The GPX file must contain a route with at least 2 points.");
        }
    }
}