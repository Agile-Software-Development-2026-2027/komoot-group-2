-- Routes (and their waypoints) saved by a user, stored as a .gpx file on disk.
CREATE TABLE saved_route_by_user (
    email              VARCHAR(255) NOT NULL REFERENCES users (email) ON UPDATE CASCADE ON DELETE CASCADE,
    saved_route_as_gpx VARCHAR(255) NOT NULL, -- path of the .gpx file on disk
    PRIMARY KEY (email, saved_route_as_gpx)
);
