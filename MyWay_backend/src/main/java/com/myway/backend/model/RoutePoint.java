package com.myway.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "route_points")
public class RoutePoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;


    @ManyToOne
    @JoinColumn(name = "route_id", nullable = false)
    private SavedRoute route;

    // Costruttore vuoto (obbligatorio per JPA)
    public RoutePoint() {
    }

    // Costruttore con campi
    public RoutePoint(Double latitude, Double longitude, SavedRoute route) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.route = route;
    }

    // Getter e Setter
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public SavedRoute getRoute() {
        return route;
    }

    public void setRoute(SavedRoute route) {
        this.route = route;
    }
}