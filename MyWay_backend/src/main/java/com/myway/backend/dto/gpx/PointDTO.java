package com.myway.backend.dto.gpx;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PointDTO {
    private double latitude;
    private double longitude;
    private Double elevation;
    private String name;
}
