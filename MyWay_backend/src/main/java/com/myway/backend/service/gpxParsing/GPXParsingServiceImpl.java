package com.myway.backend.service.gpxParsing;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.myway.backend.dto.GPXDataDTO;
import com.myway.backend.dto.GPXDataDTO.PointDTO;
import com.myway.backend.dto.GPXDataDTO.RouteDTO;

import io.jenetics.jpx.GPX;
import io.jenetics.jpx.TrackSegment;
import io.jenetics.jpx.WayPoint;

@Service
public class GPXParsingServiceImpl implements GPXParsingService{

    //
    // Extract important data (waypoints, routes and tracks) of the GPX file. 
    // For GPX, Tracks are a log of where the device actually went (GPS); Routes are a sequence of waypoints 
    // The definition of GPXDataDTO is in com/myway/backend/dto
    // This function should also maintain the temporal order of points, so waypoints[0] is the first point and waypoints[len -1] is the last 
    //
    @Override
    public GPXDataDTO parseGPX(MultipartFile file){Path tempFile = null;
    try {
        tempFile = Files.createTempFile("gpx-upload-", ".gpx");
        try (InputStream is = file.getInputStream()) {
            Files.copy(is, tempFile, StandardCopyOption.REPLACE_EXISTING);
        }

        GPX gpx = GPX.read(tempFile);

        List<PointDTO> waypoints = gpx.wayPoints()
            .map(this::mapToPointDTO)
            .collect(Collectors.toList());

        List<RouteDTO> routes = gpx.routes()
            .map(route -> {
                List<PointDTO> points = route.points()
                    .map(this::mapToPointDTO)
                    .collect(Collectors.toList());

                return new RouteDTO(route.getName().orElse("Unnamed Route"), points);
            })
            .collect(Collectors.toList());

        List<RouteDTO> tracks = gpx.tracks()
            .map(track -> {
                List<PointDTO> points = track.segments()
                    .flatMap(TrackSegment::points)
                    .map(this::mapToPointDTO)
                    .collect(Collectors.toList());

                return new RouteDTO(track.getName().orElse("Unnamed Track"), points);
            })
            .collect(Collectors.toList());

        return new GPXDataDTO(waypoints, routes, tracks);

    } catch (IOException e) {
        throw new RuntimeException("Error parsing GPX file: " + e.getMessage(), e);
    } finally {
        //just to be sure that the tempfile is always removed
        if (tempFile != null) {
            try {
                Files.deleteIfExists(tempFile);
            } catch (IOException ignored) {
                // this should never throw (throws if the file is a dir not empty or it has insufficient access ...)
            }
        }
    }
    }


    // helper fun
    private PointDTO mapToPointDTO(WayPoint pt) {
        Double elevation = pt.getElevation()
                            .map(Number::doubleValue)
                            .orElse(null);

        return new PointDTO(
            pt.getLatitude().doubleValue(),
            pt.getLongitude().doubleValue(),
            elevation,
            pt.getName().orElse(null)
        );
    }
}