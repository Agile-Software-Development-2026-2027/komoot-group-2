package com.myway.backend.repository;

import com.myway.backend.model.Waypoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WaypointRepository extends JpaRepository<Waypoint, Integer> {

    List<Waypoint> findByIsPublicTrue();

    List<Waypoint> findByPublisherEmail(String email);
}
