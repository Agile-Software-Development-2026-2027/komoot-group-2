
package com.myway.backend.repository;

import com.myway.backend.model.Route;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RouteRepository extends JpaRepository<Route, Integer> {

    List<Route> findByIsPublicTrue();

    List<Route> findByPublisherEmail(String email);

    // Public routes that nobody has reported
    @EntityGraph(attributePaths = {"publisher"})
    List<Route> findByIsPublicTrueAndReportsIsEmpty();

    // All routes of one publisher, newest first
    @EntityGraph(attributePaths = {"publisher"})
    List<Route> findByPublisherEmailOrderByIdDesc(String email);

    // One route belonging to the given publisher
    @EntityGraph(attributePaths = {"publisher"})
    Optional<Route> findByIdAndPublisherEmail(Integer id, String email);

    // Visible public routes inside a bounding box
    @EntityGraph(attributePaths = {"publisher"})
    List<Route> findByIsPublicTrueAndStartLatitudeBetweenAndStartLongitudeBetweenAndReportsIsEmpty(
            double minLat,
            double maxLat,
            double minLon,
            double maxLon
    );
}
