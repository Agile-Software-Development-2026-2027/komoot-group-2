package com.myway.backend.repository;

import com.myway.backend.model.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

import java.util.List;

public interface RouteRepository extends JpaRepository<Route, Integer> {

    List<Route> findByIsPublicTrue();

    List<Route> findByPublisherEmail(String email);

    // public routes that nobody has reported
    @Query("""
        SELECT r FROM Route r
        JOIN FETCH r.publisher
        WHERE r.isPublic = true
        AND NOT EXISTS (
            SELECT rr FROM RouteReport rr
            WHERE rr.route = r
        )
        """)
    List<Route> findVisiblePublicRoutes();

    // all routes of one publisher (publisher is fetched too, open-in-view is off)
    @Query("""
        SELECT r FROM Route r
        JOIN FETCH r.publisher
        WHERE r.publisher.email = :email
        ORDER BY r.id DESC
        """)
    List<Route> findAllByPublisherWithPublisher(@Param("email") String email);

    // one route, only if it belongs to the given publisher
    @Query("""
        SELECT r FROM Route r
        JOIN FETCH r.publisher
        WHERE r.id = :id AND r.publisher.email = :email
        """)
    Optional<Route> findOwnedById(@Param("id") Integer id, @Param("email") String email);
}