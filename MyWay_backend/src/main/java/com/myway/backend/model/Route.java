package com.myway.backend.model;

import com.myway.backend.model.enums.Difficulty;
import com.myway.backend.model.enums.RouteCategory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "route")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Route {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 255)
    private String name;

    /** Path of the .gpx file holding the track; the file itself lives on disk at this path. */
    @Column(name = "gpx_path", nullable = false, length = 255)
    private String gpxPath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RouteCategory category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "publisher", nullable = false)
    private User publisher;

    @Column(name = "picture_path")
    private String picturePath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Difficulty difficulty;

    @Column(name = "estimated_time_in_minutes")
    private Integer estimatedTimeInMinutes;

    @Column(name = "length_in_meters")
    private Double lengthInMeters;

    @Builder.Default
    @Column(name = "is_public", nullable = false)
    private boolean isPublic = false;
}
