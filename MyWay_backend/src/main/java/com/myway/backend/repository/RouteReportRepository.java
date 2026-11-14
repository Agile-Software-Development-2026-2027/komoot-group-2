package com.myway.backend.repository;

import com.myway.backend.model.RouteReport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RouteReportRepository extends JpaRepository<RouteReport, RouteReport.Id> {

    long countByRouteId(Integer routeId);
}
