package com.myway.backend.repository;

import com.myway.backend.model.WaypointReport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WaypointReportRepository extends JpaRepository<WaypointReport, WaypointReport.Id> {

    long countByWaypointId(Integer waypointId);
}
