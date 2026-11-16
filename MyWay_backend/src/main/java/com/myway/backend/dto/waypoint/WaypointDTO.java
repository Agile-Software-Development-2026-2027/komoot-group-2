package com.myway.backend.dto.waypoint;

import com.myway.backend.model.enums.WaypointCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WaypointDTO {
    private Integer id;
    private Set<WaypointCategory> categories;
    private String description;
    private double latitude;
    private double longitude;
    /** Relative URLs, e.g. /api/waypoints/pictures/abc.png */
    private List<String> photos;
    /** Username of the user who published the waypoint. */
    private String publisher;
}
