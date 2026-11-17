package com.myway.backend.repository;

import com.myway.backend.model.Waypoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WaypointRepository extends JpaRepository<Waypoint, Integer> {

    List<Waypoint> findByIsPublicTrue();

    List<Waypoint> findByPublisherEmail(String email);

    /** Public waypoints inside a latitude/longitude bounding box (cheap pre-filter for the radius search). */
    List<Waypoint> findByIsPublicTrueAndLatitudeBetweenAndLongitudeBetween(
            double minLatitude, double maxLatitude, double minLongitude, double maxLongitude);
}
