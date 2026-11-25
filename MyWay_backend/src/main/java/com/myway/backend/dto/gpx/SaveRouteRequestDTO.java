package com.myway.backend.dto.gpx;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Saves an existing Route (own or public) in a folder, optionally with some of its waypoints. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaveRouteRequestDTO {
    private Long folderId;
    private String name;
    private Integer routeId;
    /** Ids of rows of the Waypoint table (own or public). May be null. */
    private List<Integer> waypointIds;
}
