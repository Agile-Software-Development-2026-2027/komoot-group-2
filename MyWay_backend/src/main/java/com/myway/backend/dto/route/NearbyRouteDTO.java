package com.myway.backend.dto.route;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Light route info for the map: no track points, no email, no file system paths. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NearbyRouteDTO {
    private Integer id;
    private String name;
    private String category;
    private String difficulty;
    private Double distanceMeters;
    private Integer estimatedTimeInMinutes;
    private String publisherUsername;
    private String pictureUrl;
    private double startLatitude;
    private double startLongitude;
    private double distanceFromUserKm;
}