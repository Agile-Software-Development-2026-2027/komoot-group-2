package com.myway.backend.repository;

import com.myway.backend.model.*;
import com.myway.backend.model.enums.Difficulty;
import com.myway.backend.model.enums.RouteCategory;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Runs on the Flyway-created schema (V5/V6: folders, saved_routes, route_points). */
@DataJpaTest
class FolderRepositoryTests {

    @Autowired private UserRepository users;
    @Autowired private FolderRepository folders;
    @Autowired private SavedRouteRepository savedRoutes;
    @Autowired private EntityManager em;

    private void user(String email) {
        users.save(User.builder().email(email).username(email.split("@")[0]).password("hash").build());
    }

    @Test
    void aUserCanHaveManyFoldersEvenWithTheSameName() {
        user("alice@example.com");
        user("bob@example.com");
        folders.save(new Folder("Hiking", "alice@example.com"));
        folders.save(new Folder("Cycling", "alice@example.com"));
        folders.save(new Folder("Hiking", "alice@example.com"));
        folders.save(new Folder("Hiking", "bob@example.com"));
        em.flush();

        assertThat(folders.findByUserEmail("alice@example.com")).hasSize(3);
        assertThat(folders.findByUserEmail("bob@example.com")).hasSize(1);
        assertThat(folders.findByUserEmail("nobody@example.com")).isEmpty();
    }

    private Route route(String email) {
        User publisher = users.findById(email).orElseThrow();
        Route route = Route.builder().name("Loop").gpxPath("x.gpx").category(RouteCategory.HIKING)
                .difficulty(Difficulty.EASY).publisher(publisher).build();
        em.persist(route);
        return route;
    }

    private Waypoint waypoint(String email) {
        User publisher = users.findById(email).orElseThrow();
        Waypoint waypoint = Waypoint.builder().name("Spring").latitude(45.0).longitude(7.0).publisher(publisher).build();
        em.persist(waypoint);
        return waypoint;
    }

    @Test
    void savedRoutesReferenceARouteAndWaypoints() {
        user("alice@example.com");
        Folder folder = folders.save(new Folder("Hiking", "alice@example.com"));
        Route route = route("alice@example.com");
        Waypoint waypoint = waypoint("alice@example.com");
        SavedRoute saved = new SavedRoute("Loop", folder, route);
        saved.getPoints().add(new RoutePoint("Spring", waypoint, saved));
        savedRoutes.saveAndFlush(saved);
        em.clear();

        SavedRoute loaded = savedRoutes.findByFolderId(folder.getId()).get(0);
        assertThat(loaded.getRoute().getId()).isEqualTo(route.getId());
        assertThat(loaded.getPoints()).extracting(p -> p.getWaypoint().getId()).containsExactly(waypoint.getId());
    }

    @Test
    void folderMustBelongToAnExistingUser() {
        assertThatThrownBy(() -> folders.saveAndFlush(new Folder("Ghost", "missing@example.com")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deletingTheUserDeletesFoldersRoutesAndPoints() {
        user("alice@example.com");
        user("bob@example.com"); // publishes the route/waypoint, which outlive alice
        Folder folder = folders.save(new Folder("Hiking", "alice@example.com"));
        Route route = route("bob@example.com");
        Waypoint waypoint = waypoint("bob@example.com");
        SavedRoute saved = new SavedRoute("Loop", folder, route);
        saved.getPoints().add(new RoutePoint("Spring", waypoint, saved));
        savedRoutes.saveAndFlush(saved);
        em.clear();

        em.createNativeQuery("DELETE FROM users WHERE email = 'alice@example.com'").executeUpdate();
        em.clear();

        assertThat(folders.findByUserEmail("alice@example.com")).isEmpty();
        assertThat(((Number) em.createNativeQuery("SELECT COUNT(*) FROM saved_routes").getSingleResult()).intValue()).isZero();
        assertThat(((Number) em.createNativeQuery("SELECT COUNT(*) FROM route_points").getSingleResult()).intValue()).isZero();
        assertThat(((Number) em.createNativeQuery("SELECT COUNT(*) FROM route").getSingleResult()).intValue()).isEqualTo(1);
    }
}
