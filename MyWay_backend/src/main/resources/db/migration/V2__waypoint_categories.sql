-- A waypoint can have several categories (the frontend lets the user pick more than one).
CREATE TABLE waypoint_categories (
    waypoint_id INTEGER     NOT NULL REFERENCES waypoint (id) ON DELETE CASCADE,
    category    VARCHAR(30) NOT NULL,
    PRIMARY KEY (waypoint_id, category)
);

INSERT INTO waypoint_categories (waypoint_id, category)
SELECT id, category FROM waypoint;

ALTER TABLE waypoint DROP COLUMN category;

-- Speeds up the "waypoints near me" bounding-box query.
CREATE INDEX idx_waypoint_public_location ON waypoint (is_public, latitude, longitude);
