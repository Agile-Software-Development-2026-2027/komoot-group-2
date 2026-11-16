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
public class PagedRoutesDTO {
    private List<PublicRouteDTO> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
