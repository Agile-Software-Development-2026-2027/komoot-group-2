package com.myway.backend.model;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

/** A route saved by a user in one of their folders: a name plus a reference to a Route and its waypoints. */
@Entity
@Table(name = "saved_routes")
public class SavedRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "folder_id", nullable = false)
    private Folder folder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;

    @OneToMany(mappedBy = "savedRoute", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RoutePoint> points = new ArrayList<>();

    public SavedRoute() {
    }

    public SavedRoute(String name, Folder folder, Route route) {
        this.name = name;
        this.folder = folder;
        this.route = route;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Folder getFolder() { return folder; }
    public void setFolder(Folder folder) { this.folder = folder; }

    public Route getRoute() { return route; }
    public void setRoute(Route route) { this.route = route; }

    public List<RoutePoint> getPoints() { return points; }
    public void setPoints(List<RoutePoint> points) { this.points = points; }
}
