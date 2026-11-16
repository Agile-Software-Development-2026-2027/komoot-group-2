package com.myway.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
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

    private Double elevation;

    private String name;

    @Column(name = "point_order", nullable = false)
    private Integer pointOrder;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", nullable = false)
    private SavedRoute route;

    public RoutePoint() {
    }

    public RoutePoint(Double latitude, Double longitude, Double elevation,
                      String name, Integer pointOrder, SavedRoute route) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.elevation = elevation;
        this.name = name;
        this.pointOrder = pointOrder;
        this.route = route;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getElevation() { return elevation; }
    public void setElevation(Double elevation) { this.elevation = elevation; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getPointOrder() { return pointOrder; }
    public void setPointOrder(Integer pointOrder) { this.pointOrder = pointOrder; }

    public SavedRoute getRoute() { return route; }
    public void setRoute(SavedRoute route) { this.route = route; }
}