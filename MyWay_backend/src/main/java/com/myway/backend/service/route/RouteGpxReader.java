package com.myway.backend.service.route;

import com.myway.backend.dto.gpx.PointDTO;
import io.jenetics.jpx.GPX;
import io.jenetics.jpx.TrackSegment;
import io.jenetics.jpx.WayPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** Reads the ordered points of a stored GPX file (tracks first, then routes). */
@Component
public class RouteGpxReader {

    public List<PointDTO> readPoints(String gpxPath) {
        try {
            GPX gpx = GPX.read(Path.of(gpxPath));
            List<PointDTO> points = new ArrayList<>();

            gpx.tracks().forEach(track ->
                    track.segments()
                            .flatMap(TrackSegment::points)
                            .forEach(p -> points.add(toPoint(p))));

            if (points.isEmpty()) {
                gpx.routes().forEach(route ->
                        route.points().forEach(p -> points.add(toPoint(p))));
            }
            return points;
        } catch (IOException | RuntimeException e) {
            throw new IllegalStateException("Cannot read the stored GPX file", e);
        }
    }

    /** Seconds between the first and the last timestamp of the track points; empty if the GPX has no usable times. */
    public Optional<Long> readDurationSeconds(String gpxPath) {
        try {
            GPX gpx = GPX.read(Path.of(gpxPath));
            List<Instant> times = new ArrayList<>();
            gpx.tracks().forEach(track ->
                    track.segments()
                            .flatMap(TrackSegment::points)
                            .forEach(p -> p.getTime().ifPresent(t -> times.add(t))));
            if (times.isEmpty()) {
                gpx.routes().forEach(route ->
                        route.points().forEach(p -> p.getTime().ifPresent(t -> times.add(t))));
            }
            if (times.size() < 2) return Optional.empty();
            long seconds = Duration.between(times.get(0), times.get(times.size() - 1)).getSeconds();
            return seconds > 0 ? Optional.of(seconds) : Optional.empty();
        } catch (IOException | RuntimeException e) {
            return Optional.empty();
        }
    }

    private PointDTO toPoint(WayPoint pt) {
        Double elevation = pt.getElevation().map(Number::doubleValue).orElse(null);
        return new PointDTO(pt.getLatitude().doubleValue(), pt.getLongitude().doubleValue(),
                elevation, pt.getName().orElse(null));
    }
}