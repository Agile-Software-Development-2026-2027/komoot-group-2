package com.myway.backend.service.statistics;

import com.myway.backend.dto.GPXDataDTO.PointDTO;
import com.myway.backend.dto.GPXDataDTO.RouteDTO;

public interface StatisticsService {
    
    // It returns the elevation gain (finish.elev - start.elev)
    double elevationGain(PointDTO start, PointDTO finish);

    // Actual length of the track
    double trackLength(RouteDTO track);

    // Straight-line track lenght
    double straightLineTrackLength(RouteDTO track);
}
