package com.myway.backend.service.waypoint;

import com.myway.backend.model.User;
import com.myway.backend.model.Waypoint;
import com.myway.backend.model.enums.WaypointCategory;
import com.myway.backend.repository.UserRepository;
import com.myway.backend.repository.WaypointRepository;
import com.myway.backend.util.JWTService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Base64;
import java.util.Set;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
class WaypointControllerTests {

    // 1x1 transparent PNG
    private static final String PNG_BASE64 =
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

    @Autowired private MockMvc mvc;
    @Autowired private UserRepository users;
    @Autowired private WaypointRepository waypoints;
    @Autowired private JWTService jwt;

    private String token;

    @BeforeEach
    void setUp() {
        waypoints.deleteAll();
        users.save(User.builder().email("hiker@example.com").username("hiker").password("hash").build());
        token = "Bearer " + jwt.generateToken("hiker@example.com");
    }

    private String body(String categories, double lat, double lon, String photos) {
        return """
            {"categories": %s, "description": "Nice spot", "latitude": %s, "longitude": %s, "photos": %s}
            """.formatted(categories, lat, lon, photos);
    }

    @Test
    void publishRequiresLogin() throws Exception {
        mvc.perform(post("/api/waypoints").contentType(MediaType.APPLICATION_JSON)
                        .content(body("[\"PEAK\"]", 46, 11, "[]")))
                .andExpect(status().isUnauthorized());
        assertThat(waypoints.count()).isZero();
    }

    @Test
    void publishSavesAPublicWaypointAndItsPhotoPath() throws Exception {
        String photo = "\"data:image/png;base64," + PNG_BASE64 + "\"";

        String response = mvc.perform(post("/api/waypoints").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("[\"PEAK\",\"FOUNTAIN\"]", 46.0, 11.1, "[" + photo + "]")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.categories", hasSize(2)))
                .andExpect(jsonPath("$.photos[0]", startsWith("/api/waypoints/pictures/")))
                .andReturn().getResponse().getContentAsString();

        Waypoint saved = waypoints.findAll().get(0);
        assertThat(saved.isPublic()).isTrue();
        assertThat(saved.getPublisher().getEmail()).isEqualTo("hiker@example.com");
        assertThat(saved.getCategories()).containsExactlyInAnyOrder(WaypointCategory.PEAK, WaypointCategory.FOUNTAIN);
        assertThat(saved.getPicturePaths()).hasSize(1).allMatch(p -> p.endsWith(".png"));

        // the stored picture is served back, identical to what was uploaded
        String url = response.replaceAll(".*\"photos\":\\[\"([^\"]+)\"].*", "$1");
        mvc.perform(get(url)).andExpect(status().isOk()).andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(content().bytes(Base64.getDecoder().decode(PNG_BASE64)));
    }

    @Test
    void publishRejectsInvalidInput() throws Exception {
        // no categories
        mvc.perform(post("/api/waypoints").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                .content(body("[]", 46, 11, "[]"))).andExpect(status().isBadRequest());
        // latitude out of range
        mvc.perform(post("/api/waypoints").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                .content(body("[\"PEAK\"]", 123, 11, "[]"))).andExpect(status().isBadRequest());
        // not an image
        mvc.perform(post("/api/waypoints").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                .content(body("[\"PEAK\"]", 46, 11, "[\"data:text/html;base64,PGI+\"]"))).andExpect(status().isBadRequest());
        assertThat(waypoints.count()).isZero();
    }

    @Test
    void nearbyReturnsOnlyPublicWaypointsWithinTheRadius() throws Exception {
        User owner = users.findById("hiker@example.com").orElseThrow();
        save(owner, 45.4642, 9.19, true);   // Milan, public
        save(owner, 45.0703, 7.6869, true); // Turin, public, ~125 km from Milan
        save(owner, 41.9028, 12.4964, true); // Rome, public, ~480 km from Milan
        save(owner, 45.47, 9.2, false);     // next to Milan but private

        mvc.perform(get("/api/waypoints/nearby").param("lat", "45.4642").param("lon", "9.19"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
        mvc.perform(get("/api/waypoints/nearby").param("lat", "45.4642").param("lon", "9.19").param("radiusKm", "10"))
                .andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/waypoints/nearby").param("lat", "95").param("lon", "9.19"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void picturesCannotEscapeTheUploadsFolder() throws Exception {
        mvc.perform(get("/api/waypoints/pictures/missing.png")).andExpect(status().isNotFound());
        mvc.perform(get("/api/waypoints/pictures/..%2Fapplication.properties")).andExpect(status().is4xxClientError());
    }

    private void save(User owner, double lat, double lon, boolean isPublic) {
        waypoints.save(Waypoint.builder().categories(Set.of(WaypointCategory.PEAK)).publisher(owner)
                .latitude(lat).longitude(lon).isPublic(isPublic).build());
    }
}
