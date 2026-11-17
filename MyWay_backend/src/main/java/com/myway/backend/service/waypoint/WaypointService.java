package com.myway.backend.service.waypoint;

import com.myway.backend.dto.waypoint.PublishWaypointRequestDTO;
import com.myway.backend.dto.waypoint.WaypointDTO;
import org.springframework.core.io.Resource;

import java.util.List;

public interface WaypointService {

    /** Saves a new public waypoint (and its photos on disk) published by the user with the given email. */
    WaypointDTO publish(String publisherEmail, PublishWaypointRequestDTO request);

    /** Public waypoints within radiusKm kilometres of the given point. */
    List<WaypointDTO> findNearby(double latitude, double longitude, double radiusKm);

    /** A stored picture, looked up by file name. */
    Resource loadPicture(String fileName);
}
