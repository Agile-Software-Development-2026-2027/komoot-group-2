package com.myway.backend.dto;

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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RouteDTO {
        private String name;
        private List<PointDTO> points;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PointDTO{
        private double latitude;
        private double longitude;
        private double elevation;
        private String name;
    }
}