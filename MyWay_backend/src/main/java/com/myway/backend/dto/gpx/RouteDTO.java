package com.myway.backend.dto.gpx;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteDTO {
    private String name;
    private List<PointDTO> points;
}
