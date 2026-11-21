package com.myway.backend.dto.route;

import com.myway.backend.dto.gpx.PointDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Route info plus the ordered points to draw it on the map. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteDetailsDTO {
    private RouteSummaryDTO route;
    private List<PointDTO> points;
}