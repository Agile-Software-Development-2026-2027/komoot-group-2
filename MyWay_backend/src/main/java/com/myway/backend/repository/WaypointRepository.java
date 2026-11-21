package com.myway.backend.repository;

import com.myway.backend.model.Waypoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WaypointRepository extends JpaRepository<Waypoint, Integer> {

    List<Waypoint> findByIsPublicTrue();

    List<Waypoint> findByPublisherEmail(String email);

    /** Public waypoints inside a latitude/longitude bounding box (cheap pre-filter for the radius search). */
    List<Waypoint> findByIsPublicTrueAndLatitudeBetweenAndLongitudeBetween(
            double minLatitude, double maxLatitude, double minLongitude, double maxLongitude);

    /**
     * Public waypoints inside a bounding box that nobody has reported
     * (one report is enough to hide a waypoint). The publisher is fetched
     * because open-in-view is disabled.
     */
    @Query("""
            SELECT w FROM Waypoint w
            JOIN FETCH w.publisher
            WHERE w.isPublic = true
              AND w.latitude BETWEEN :minLat AND :maxLat
              AND w.longitude BETWEEN :minLon AND :maxLon
              AND NOT EXISTS (SELECT 1 FROM WaypointReport r WHERE r.waypoint = w)
            """)
    List<Waypoint> findVisiblePublicInBox(@Param("minLat") double minLat,
                                          @Param("maxLat") double maxLat,
                                          @Param("minLon") double minLon,
                                          @Param("maxLon") double maxLon);
}
