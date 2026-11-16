package com.myway.backend.service.routeSearch;

import com.myway.backend.dto.gpx.PagedRoutesDTO;

public interface RouteSearchService {

    PagedRoutesDTO getPublicRoutes(String query, int page, int size);
}
