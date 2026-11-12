package com.myway.backend.repository;

import com.myway.backend.model.Route;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RouteRepository extends JpaRepository<Route, Integer> {

    List<Route> findByActiveTrue();

    List<Route> findByPublisherEmail(String email);
}
