package com.myway.backend.dto.gpx;

import com.myway.backend.model.enums.Difficulty;
import com.myway.backend.model.enums.RouteCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicRouteDTO {
    private Integer id;
    private String name;
    private RouteCategory category;
    private Difficulty difficulty;
    private String publisherEmail;
    private String publisherUsername;
    private Integer estimatedTimeInMinutes;
    private Double lengthInMeters;
    private GPXDataDTO gpxData;
}
