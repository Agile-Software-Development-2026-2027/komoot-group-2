-- Saved routes no longer store their own geometry: they point to a Route, and
-- their waypoints point to rows of the Waypoint table.
DROP TABLE route_points;
DROP TABLE saved_routes;

CREATE TABLE saved_routes (
    id        BIGSERIAL PRIMARY KEY,
    name      VARCHAR(255) NOT NULL,
    folder_id BIGINT  NOT NULL REFERENCES folders (id) ON DELETE CASCADE,
    route_id  INTEGER NOT NULL REFERENCES route (id) ON DELETE CASCADE
);

CREATE TABLE route_points (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(255),
    saved_route_id BIGINT  NOT NULL REFERENCES saved_routes (id) ON DELETE CASCADE,
    waypoint_id    INTEGER NOT NULL REFERENCES waypoint (id) ON DELETE CASCADE
);

CREATE INDEX idx_saved_routes_folder_id ON saved_routes (folder_id);
CREATE INDEX idx_saved_routes_route_id ON saved_routes (route_id);
CREATE INDEX idx_route_points_saved_route_id ON route_points (saved_route_id);
