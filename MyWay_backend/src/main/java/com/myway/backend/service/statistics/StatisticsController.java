package com.myway.backend.service.statistics;

import com.myway.backend.dto.statistics.UserStatisticsDTO;
import com.myway.backend.util.LoginRequired;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
public class StatisticsController {

    private final StatisticsService statisticsService;

    // GET /api/statistics -> statistics computed on the routes in the folders of the logged-in user
    @LoginRequired
    @GetMapping
    public UserStatisticsDTO getMyStatistics(Authentication authentication) {
        return statisticsService.getUserStatistics(authentication.getName());
    }
}
