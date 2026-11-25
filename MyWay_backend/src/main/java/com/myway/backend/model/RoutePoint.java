package com.myway.backend.model;

import jakarta.persistence.*;

/** A waypoint of a saved route: a name plus a reference to a row of the Waypoint table. */
@Entity
@Table(name = "route_points")
public class RoutePoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "saved_route_id", nullable = false)
    private SavedRoute savedRoute;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "waypoint_id", nullable = false)
    private Waypoint waypoint;

    public RoutePoint() {
    }

    public RoutePoint(String name, Waypoint waypoint, SavedRoute savedRoute) {
        this.name = name;
        this.waypoint = waypoint;
        this.savedRoute = savedRoute;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public SavedRoute getSavedRoute() { return savedRoute; }
    public void setSavedRoute(SavedRoute savedRoute) { this.savedRoute = savedRoute; }

    public Waypoint getWaypoint() { return waypoint; }
    public void setWaypoint(Waypoint waypoint) { this.waypoint = waypoint; }
}
