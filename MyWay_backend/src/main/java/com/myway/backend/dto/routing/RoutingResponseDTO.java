package com.myway.backend.dto.routing;

import com.myway.backend.util.GeoUtils.GeoPoint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoutingResponseDTO {
    private List<GeoPoint> points;
    private double distanceMeters;
    private double durationSeconds;
}
