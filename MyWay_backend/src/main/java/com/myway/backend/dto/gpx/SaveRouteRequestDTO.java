package com.myway.backend.dto.gpx;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaveRouteRequestDTO {
    private Long folderId;
    private String name;
    private List<PointDTO> points;
}