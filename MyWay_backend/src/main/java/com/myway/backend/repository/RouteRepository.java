package com.myway.backend.repository;

import com.myway.backend.model.Route;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RouteRepository extends JpaRepository<Route, Integer> {

    List<Route> findByIsPublicTrue();

    List<Route> findByPublisherEmail(String email);

    @Query("""
            SELECT r FROM Route r
            WHERE r.isPublic = true
              AND (:query IS NULL OR :query = ''
                   OR LOWER(r.name) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(r.publisher.username) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(CAST(r.category AS string)) LIKE LOWER(CONCAT('%', :query, '%')))
            """)
    Page<Route> searchPublicRoutes(@Param("query") String query, Pageable pageable);
}
