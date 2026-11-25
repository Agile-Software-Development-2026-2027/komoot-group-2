package com.myway.backend.service.statistics;

import com.myway.backend.dto.gpx.PointDTO;
import com.myway.backend.dto.gpx.RouteDTO;
import com.myway.backend.dto.statistics.UserStatisticsDTO;

public interface StatisticsService {
    
    // It returns the elevation gain (finish.elev - start.elev)
    double elevationGain(PointDTO start, PointDTO finish);

    // Actual length of the track
    double trackLength(RouteDTO track);

    // Straight-line track lenght
    double straightLineTrackLength(RouteDTO track);

    // Statistics of the routes saved in the folders of the user (each Route counted once)
    UserStatisticsDTO getUserStatistics(String userEmail);
}
