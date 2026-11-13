package com.myway.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

/** A user reporting a route (one report per user per route). */
@Entity
@Table(name = "report_route")
@Getter
@Setter
@NoArgsConstructor
public class RouteReport {

    @EmbeddedId
    private Id id = new Id();

    @MapsId("routeId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_id")
    private Route route;

    @MapsId("reporterEmail")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_email")
    private User reporter;

    public RouteReport(Route route, User reporter) {
        this.id = new Id(route.getId(), reporter.getEmail());
        this.route = route;
        this.reporter = reporter;
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Id implements Serializable {
        @Column(name = "route_id")
        private Integer routeId;

        @Column(name = "reporter_email")
        private String reporterEmail;
    }
}
