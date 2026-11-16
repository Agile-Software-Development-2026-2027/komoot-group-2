package com.myway.backend.service.routeSearch;

import com.myway.backend.model.Route;
import com.myway.backend.model.User;
import com.myway.backend.model.enums.Difficulty;
import com.myway.backend.model.enums.RouteCategory;
import com.myway.backend.repository.RouteRepository;
import com.myway.backend.repository.UserRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RouteSearchControllerTests {

    @Autowired private MockMvc mvc;
    @Autowired private UserRepository users;
    @Autowired private RouteRepository routes;

    @TempDir Path tempDir;

    @BeforeEach
    void setUp() throws Exception {
        routes.deleteAll();
        users.deleteAll();

        User alice = users.save(User.builder()
                .email("alice@test.it")
                .username("alice")
                .password("hash")
                .build());

        Path gpxFile = tempDir.resolve("dolomites.gpx");
        Files.writeString(gpxFile, """
                <?xml version="1.0" encoding="UTF-8"?>
                <gpx version="1.1" creator="MyWay" xmlns="http://www.topografix.com/GPX/1/1">
                  <trk>
                    <name>Tre Cime Loop</name>
                    <trkseg>
                      <trkpt lat="46.6125" lon="12.2961"><ele>2320</ele></trkpt>
                      <trkpt lat="46.6305" lon="12.3097"><ele>2405</ele></trkpt>
                    </trkseg>
                  </trk>
                </gpx>
                """);

        routes.save(Route.builder()
                .name("Tre Cime Loop")
                .gpxPath(gpxFile.toString())
                .category(RouteCategory.HIKING)
                .difficulty(Difficulty.MEDIUM)
                .publisher(alice)
                .estimatedTimeInMinutes(120)
                .lengthInMeters(9800.0)
                .isPublic(true)
                .build());

        routes.save(Route.builder()
                .name("Via Appia Antica Ride")
                .gpxPath("non-existent.gpx")
                .category(RouteCategory.CYCLING)
                .difficulty(Difficulty.EASY)
                .publisher(alice)
                .estimatedTimeInMinutes(45)
                .lengthInMeters(11200.0)
                .isPublic(true)
                .build());

        routes.save(Route.builder()
                .name("Secret Private Trail")
                .gpxPath("private.gpx")
                .category(RouteCategory.HIKING)
                .difficulty(Difficulty.HARD)
                .publisher(alice)
                .isPublic(false)
                .build());
    }

    @Test
    void returnsPaginatedPublicRoutesWithParsedGpxData() throws Exception {
        mvc.perform(get("/api/routes/public").param("page", "0").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content[0].name").value("Tre Cime Loop"))
                .andExpect(jsonPath("$.content[0].publisherUsername").value("alice"))
                .andExpect(jsonPath("$.content[0].gpxData.tracks[0].points", hasSize(2)));

        mvc.perform(get("/api/routes/public").param("page", "1").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Via Appia Antica Ride"));
    }

    @Test
    void filtersPublicRoutesByQuery() throws Exception {
        mvc.perform(get("/api/routes/public").param("q", "appia"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Via Appia Antica Ride"));
    }
}
