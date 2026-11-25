package com.myway.backend.dto.statistics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/** Statistics of a user, computed on the routes saved in the user's folders (each Route counted once). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatisticsDTO {
    private int tripCount;
    private long totalDurationSeconds;
    private double totalDistanceMeters;
    private double totalElevationGainMeters;
    /** RouteCategory name -> number of routes. */
    private Map<String, Integer> routeTypes;
    /** Difficulty name -> number of routes. */
    private Map<String, Integer> difficulties;
    /** WaypointCategory name -> number of waypoints. */
    private Map<String, Integer> waypointCategories;
}
