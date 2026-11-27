package com.myway.backend.dto.gpx;

import com.myway.backend.dto.route.RouteSummaryDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** A saved route with the data of the Route it points to. {@code points} is only filled for a single route. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavedRouteDTO {
    private Long id;
    private String name;
    private Long folderId;
    private RouteSummaryDTO route;
    private List<PointDTO> points;
    private List<SavedWaypointDTO> waypoints;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SavedWaypointDTO {
        private Long id;
        private String name;
        private Integer waypointId;
        private Double latitude;
        private Double longitude;
    }
}
