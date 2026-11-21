package com.myway.backend.dto.route;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Route info returned to clients. Never contains emails or file system paths. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteSummaryDTO {
    private Integer id;
    private String name;
    private String category;
    private String difficulty;
    private Double distanceMeters;
    private Integer estimatedTimeInMinutes;
    private String publisherUsername;
    private String pictureUrl;
    private boolean publicRoute;
    private boolean reported;
}