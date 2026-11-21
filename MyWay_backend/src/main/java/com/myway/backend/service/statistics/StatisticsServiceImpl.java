package com.myway.backend.service.statistics;

import org.springframework.stereotype.Service;

import com.myway.backend.dto.gpx.PointDTO;
import com.myway.backend.dto.gpx.RouteDTO;

import io.jenetics.jpx.Point;
import io.jenetics.jpx.WayPoint;
import io.jenetics.jpx.geom.Geoid;

@Service 
public class StatisticsServiceImpl implements StatisticsService {

    @Override
    public double elevationGain(PointDTO start, PointDTO finish) {
        if (start == null || finish == null || start.getElevation() == null || finish.getElevation() == null) {
            return 0.0;
        }
        return finish.getElevation() - start.getElevation();
    }

    @Override
    public double trackLength(RouteDTO track) {
        if (track == null || track.getPoints() == null || track.getPoints().size() < 2) {
            return 0.0;
        }
        double totalDistanceMeters = 0.0;
        for (int i = 0; i < track.getPoints().size() - 1; i++) {
            // just because the WGS84.distance signature is for 2 Point (jpx object)
            Point p1 = convertToJPXPoint(track.getPoints().get(i));
            Point p2 = convertToJPXPoint(track.getPoints().get(i + 1));
            totalDistanceMeters += Geoid.WGS84.distance(p1, p2).doubleValue();
        }
        return totalDistanceMeters;
    }

    @Override
    public double straightLineTrackLength(RouteDTO track) {
        if (track == null || track.getPoints() == null || track.getPoints().isEmpty()) {
            return 0.0;
        }
        return Geoid.WGS84.distance(
            this.convertToJPXPoint(track.getPoints().get(0)), 
            this.convertToJPXPoint(track.getPoints().get(track.getPoints().size()-1))
        ).doubleValue();
    }
    
    // helper that returns a Point (jpx)
    private Point convertToJPXPoint(PointDTO pointDTO) {
        return WayPoint.of(pointDTO.getLatitude(), pointDTO.getLongitude());
    }
}
