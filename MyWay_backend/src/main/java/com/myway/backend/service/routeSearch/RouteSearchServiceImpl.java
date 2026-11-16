package com.myway.backend.service.routeSearch;

import com.myway.backend.dto.gpx.GPXDataDTO;
import com.myway.backend.dto.gpx.PagedRoutesDTO;
import com.myway.backend.dto.gpx.PublicRouteDTO;
import com.myway.backend.model.Route;
import com.myway.backend.repository.RouteRepository;
import com.myway.backend.service.gpxParsing.GPXParsingService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RouteSearchServiceImpl implements RouteSearchService {

    private static final int MAX_PAGE_SIZE = 50;

    private final RouteRepository routeRepository;
    private final GPXParsingService gpxParsingService;

    @Override
    @Transactional(readOnly = true)
    public PagedRoutesDTO getPublicRoutes(String query, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        String normalizedQuery = query == null ? "" : query.trim();

        Page<Route> routePage = routeRepository.searchPublicRoutes(
                normalizedQuery,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.ASC, "id"))
        );

        List<PublicRouteDTO> content = routePage.getContent().stream()
                .map(this::toPublicRouteDTO)
                .toList();

        return PagedRoutesDTO.builder()
                .content(content)
                .page(routePage.getNumber())
                .size(routePage.getSize())
                .totalElements(routePage.getTotalElements())
                .totalPages(routePage.getTotalPages())
                .build();
    }

    private PublicRouteDTO toPublicRouteDTO(Route route) {
        GPXDataDTO gpxData = null;
        if (route.getGpxPath() != null && !route.getGpxPath().isBlank()) {
            try {
                Path path = Path.of(route.getGpxPath());
                if (Files.isRegularFile(path)) {
                    gpxData = gpxParsingService.parseGPX(path);
                }
            } catch (RuntimeException ignored) {
                // Keep route metadata available even if the GPX file on disk cannot be read
            }
        }

        return PublicRouteDTO.builder()
                .id(route.getId())
                .name(route.getName())
                .category(route.getCategory())
                .difficulty(route.getDifficulty())
                .publisherEmail(route.getPublisher() != null ? route.getPublisher().getEmail() : null)
                .publisherUsername(route.getPublisher() != null ? route.getPublisher().getUsername() : null)
                .estimatedTimeInMinutes(route.getEstimatedTimeInMinutes())
                .lengthInMeters(route.getLengthInMeters())
                .gpxData(gpxData)
                .build();
    }
}
