package com.myway.backend.util;

import java.util.List;

/** Small geographic helpers (distances in metres) accurate enough for ~1 km searches. */
public final class GeoUtils {

    public static final double EARTH_RADIUS_METERS = 6_371_008.8;
    private static final double METERS_PER_DEGREE = EARTH_RADIUS_METERS * Math.PI / 180.0;

    private GeoUtils() {
    }

    public record GeoPoint(double latitude, double longitude) {
    }

    public record BoundingBox(double minLatitude, double maxLatitude,
                              double minLongitude, double maxLongitude) {
    }

    /**
     * Shortest distance from point P to the segment A-B.
     * Uses a flat local projection centred on P (equirectangular), which is
     * precise enough for distances of a few kilometres.
     */
    public static double distanceToSegmentMeters(double pLat, double pLon,
                                                 double aLat, double aLon,
                                                 double bLat, double bLon) {
        double cosLat = Math.cos(Math.toRadians(pLat));

        double ax = (aLon - pLon) * cosLat * METERS_PER_DEGREE;
        double ay = (aLat - pLat) * METERS_PER_DEGREE;
        double bx = (bLon - pLon) * cosLat * METERS_PER_DEGREE;
        double by = (bLat - pLat) * METERS_PER_DEGREE;

        double dx = bx - ax;
        double dy = by - ay;
        double lengthSquared = dx * dx + dy * dy;

        if (lengthSquared == 0.0) {
            return Math.hypot(ax, ay);
        }

        // Projection of P (the origin) on the line A-B, clamped to the segment
        double t = -(ax * dx + ay * dy) / lengthSquared;
        t = Math.max(0.0, Math.min(1.0, t));

        return Math.hypot(ax + t * dx, ay + t * dy);
    }

    /** Shortest distance from a point to a polyline. Infinity if the polyline is empty. */
    public static double distanceToPolylineMeters(double lat, double lon, List<GeoPoint> track) {
        if (track == null || track.isEmpty()) {
            return Double.POSITIVE_INFINITY;
        }
        if (track.size() == 1) {
            GeoPoint only = track.get(0);
            return distanceToSegmentMeters(lat, lon,
                    only.latitude(), only.longitude(), only.latitude(), only.longitude());
        }

        double best = Double.POSITIVE_INFINITY;
        for (int i = 0; i < track.size() - 1; i++) {
            GeoPoint a = track.get(i);
            GeoPoint b = track.get(i + 1);
            best = Math.min(best, distanceToSegmentMeters(lat, lon,
                    a.latitude(), a.longitude(), b.latitude(), b.longitude()));
        }
        return best;
    }

    /** Bounding box of the track, enlarged by marginMeters on every side. */
    public static BoundingBox boundingBox(List<GeoPoint> track, double marginMeters) {
        if (track == null || track.isEmpty()) {
            throw new IllegalArgumentException("The track has no points");
        }

        double minLat = Double.POSITIVE_INFINITY;
        double maxLat = Double.NEGATIVE_INFINITY;
        double minLon = Double.POSITIVE_INFINITY;
        double maxLon = Double.NEGATIVE_INFINITY;
        double maxAbsLat = 0.0;

        for (GeoPoint p : track) {
            minLat = Math.min(minLat, p.latitude());
            maxLat = Math.max(maxLat, p.latitude());
            minLon = Math.min(minLon, p.longitude());
            maxLon = Math.max(maxLon, p.longitude());
            maxAbsLat = Math.max(maxAbsLat, Math.abs(p.latitude()));
        }

        double latMargin = marginMeters / METERS_PER_DEGREE;
        // Use the latitude closest to the pole: it gives the widest (safe) longitude margin
        double lonMargin = latMargin / Math.max(Math.cos(Math.toRadians(maxAbsLat)), 0.01);

        return new BoundingBox(minLat - latMargin, maxLat + latMargin,
                minLon - lonMargin, maxLon + lonMargin);
    }
}