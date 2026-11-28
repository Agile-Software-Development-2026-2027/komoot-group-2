package com.myway.backend.repository;

import com.myway.backend.model.SavedRoute;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedRouteRepository extends JpaRepository<SavedRoute, Long> {

    // open-in-view is disabled: fetch what the DTOs need
    @EntityGraph(attributePaths = {"route", "route.publisher", "points", "points.waypoint"})
    List<SavedRoute> findByFolderId(Long folderId);

    // All the saved routes of the folders owned by a user (used by the statistics)
    @EntityGraph(attributePaths = {"route", "points", "points.waypoint"})
    List<SavedRoute> findByFolderUserEmail(String userEmail);

    @Override
    @EntityGraph(attributePaths = {"route", "route.publisher", "points", "points.waypoint", "folder"})
    Optional<SavedRoute> findById(Long id);
}
