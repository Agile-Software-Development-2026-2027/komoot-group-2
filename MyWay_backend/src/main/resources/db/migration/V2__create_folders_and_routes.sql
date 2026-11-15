CREATE TABLE folders (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL
);

CREATE TABLE saved_routes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    folder_id BIGINT NOT NULL,
    CONSTRAINT fk_saved_routes_folder
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE TABLE route_points (
    id BIGSERIAL PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    elevation DOUBLE PRECISION,
    name VARCHAR(255),
    point_order INTEGER NOT NULL,
    route_id BIGINT NOT NULL,
    CONSTRAINT fk_route_points_route
        FOREIGN KEY (route_id) REFERENCES saved_routes(id) ON DELETE CASCADE
);

CREATE INDEX idx_folders_user_email ON folders(user_email);
CREATE INDEX idx_saved_routes_folder_id ON saved_routes(folder_id);
CREATE INDEX idx_route_points_route_id ON route_points(route_id);