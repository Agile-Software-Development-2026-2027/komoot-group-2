package com.myway.backend.repository;

import com.myway.backend.model.Route;
import com.myway.backend.model.RouteReport;
import com.myway.backend.model.User;
import com.myway.backend.model.Waypoint;
import com.myway.backend.model.WaypointReport;
import com.myway.backend.model.enums.Difficulty;
import com.myway.backend.model.enums.RouteCategory;
import com.myway.backend.model.enums.WaypointCategory;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** Runs on the Flyway-created schema (H2 in PostgreSQL mode, see src/test/resources). */
@DataJpaTest
class RepositoryTests {

    @Autowired private UserRepository users;
    @Autowired private RouteRepository routes;
    @Autowired private WaypointRepository waypoints;
    @Autowired private RouteReportRepository routeReports;
    @Autowired private WaypointReportRepository waypointReports;
    @Autowired private EntityManager em;

    private User user(String email, String username) {
        return users.save(User.builder().email(email).username(username).password("hash").build());
    }

    @Test
    void savesAndReadsEveryTable() {
        User alice = user("alice@example.com", "alice");
        User bob = user("bob@example.com", "bob");

        Route route = routes.save(Route.builder()
                .category(RouteCategory.HIKING)
                .difficulty(Difficulty.MEDIUM)
                .publisher(alice)
                .estimatedTimeInMinutes(90)
                .lengthInMeters(5400.5)
                .build());

        Waypoint waypoint = waypoints.save(Waypoint.builder()
                .category(WaypointCategory.VIEWPOINT)
                .description("Nice view")
                .publisher(alice)
                .latitude(46.0)
                .longitude(11.1)
                .picturePaths(Set.of("a.jpg", "b.jpg"))
                .build());

        routeReports.save(new RouteReport(route, bob));
        waypointReports.save(new WaypointReport(waypoint, bob));
        em.flush();
        em.clear();

        assertThat(users.findByUsername("alice")).isPresent();
        assertThat(routes.findByActiveTrue()).extracting(Route::getId).containsExactly(route.getId());
        assertThat(routes.findByPublisherEmail("alice@example.com")).hasSize(1);
        assertThat(waypoints.findById(waypoint.getId()).orElseThrow().getPicturePaths())
                .containsExactlyInAnyOrder("a.jpg", "b.jpg");
        assertThat(routeReports.countByRouteId(route.getId())).isEqualTo(1);
        assertThat(waypointReports.countByWaypointId(waypoint.getId())).isEqualTo(1);
    }
}
