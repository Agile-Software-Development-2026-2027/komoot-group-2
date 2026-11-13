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

/** A user reporting a waypoint (one report per user per waypoint). */
@Entity
@Table(name = "report_waypoint")
@Getter
@Setter
@NoArgsConstructor
public class WaypointReport {

    @EmbeddedId
    private Id id = new Id();

    @MapsId("waypointId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "waypoint_id")
    private Waypoint waypoint;

    @MapsId("reporterEmail")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_email")
    private User reporter;

    public WaypointReport(Waypoint waypoint, User reporter) {
        this.id = new Id(waypoint.getId(), reporter.getEmail());
        this.waypoint = waypoint;
        this.reporter = reporter;
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Id implements Serializable {
        @Column(name = "waypoint_id")
        private Integer waypointId;

        @Column(name = "reporter_email")
        private String reporterEmail;
    }
}
