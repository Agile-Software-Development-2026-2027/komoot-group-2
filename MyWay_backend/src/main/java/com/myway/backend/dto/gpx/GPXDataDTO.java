package com.myway.backend.dto.gpx;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// data transfer objects for GPX
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GPXDataDTO {

    private List<PointDTO> waypoints;
    private List<RouteDTO> routes;
    private List<RouteDTO> tracks;

    
}