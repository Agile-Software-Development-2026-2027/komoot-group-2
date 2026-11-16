package com.myway.backend.repository;

import com.myway.backend.model.SavedRoute;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedRouteRepository extends JpaRepository<SavedRoute, Long> {

    // loads the routes of a folder together with their points
    @EntityGraph(attributePaths = "points")
    List<SavedRoute> findByFolderId(Long folderId);

    // loads a single route together with its points
    @Override
    @EntityGraph(attributePaths = "points")
    Optional<SavedRoute> findById(Long id);
}